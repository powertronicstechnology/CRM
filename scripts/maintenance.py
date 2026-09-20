"""GitHub Actions maintenance. Never logs credentials, SQL contents or HTTP bodies."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
from datetime import datetime, timezone


def required(name):
    value = os.environ.get(name, '')
    if not value.strip():
        raise RuntimeError(f'Missing required secret: {name}')
    return value


def request_json(url, headers):
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError('Remote request failed')
        return json.load(response)


def check_private_repo():
    repo = required('BACKUP_REPO')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo):
        raise RuntimeError('BACKUP_REPO must be owner/repository')
    info = request_json(f'https://api.github.com/repos/{repo}', {
        'Authorization': f'Bearer {required("BACKUP_PAT")}',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    })
    if info.get('private') is not True or info.get('archived'):
        raise RuntimeError('Backup destination must be a private, non-archived repository')
    if info.get('full_name', '').lower() != repo.lower():
        raise RuntimeError('Backup destination identity mismatch')
    if not info.get('permissions', {}).get('push'):
        raise RuntimeError('Backup token needs write access to the backup repository')
    print('Private backup destination verified.')


def keep_alive():
    url = required('SUPABASE_URL').rstrip('/')
    if not re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co', url):
        raise RuntimeError('Expected the HTTPS Supabase project URL')
    key = required('SUPABASE_SERVICE_ROLE_KEY')
    rows = request_json(url + '/rest/v1/metadata?select=id&limit=1', {
        'apikey': key, 'Authorization': f'Bearer {key}',
        'Accept': 'application/json',
    })
    if not isinstance(rows, list):
        raise RuntimeError('Health check returned an unexpected response')
    print('Authorized database health check succeeded.')


def run(command, *, input=None):
    result = subprocess.run(command, input=input, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=900)
    if result.returncode:
        # Tools can print connection strings and SQL on failure. Never relay their output.
        raise RuntimeError(f'{Path(command[0]).name} failed; output withheld to protect credentials and data')
    return result.stdout


def backup(destination):
    url = required('SUPABASE_DB_URL')
    if not url.startswith(('postgresql://', 'postgres://')):
        raise RuntimeError('SUPABASE_DB_URL must be a Postgres connection URI')
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query))
    if query.get('sslmode') not in ('require', 'verify-ca', 'verify-full'):
        query['sslmode'] = 'require'
    url = urlunsplit(parts._replace(query=urlencode(query)))
    passphrase = required('BACKUP_PASSPHRASE')
    if len(passphrase) < 32 or '\n' in passphrase or '\r' in passphrase:
        raise RuntimeError('Use a single-line backup passphrase of at least 32 characters')
    os.environ['PGSSLMODE'] = 'require'
    os.environ['PGCONNECT_TIMEOUT'] = '30'
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    destination = Path(destination)
    with tempfile.TemporaryDirectory(prefix='crm-backup-') as temp:
        folder = Path(temp)
        commands = {
            'roles.sql': ['--role-only'],
            'schema.sql': [],
            'data.sql': ['--data-only', '--use-copy', '-x', 'storage.buckets_vectors,storage.vector_indexes'],
        }
        manifest = {'created_at_utc': timestamp, 'files': {},
                    'scope': 'Supabase CLI logical roles, application schema and data dumps',
                    'limitations': ['Storage file bytes and project settings are not included',
                                    'Custom auth/storage schema changes need separate versioned migrations',
                                    'Three sequential dumps; schedule during quiet periods',
                                    'Restore into a separate Supabase project must be tested before relying on recovery']}
        for filename, flags in commands.items():
            path = folder / filename
            run(['supabase', 'db', 'dump', '--db-url', url, '-f', str(path), *flags])
            if not path.exists() or path.stat().st_size == 0:
                raise RuntimeError(f'Empty or missing dump: {filename}')
            content = path.read_bytes()
            if filename == 'schema.sql' and (b'CREATE TABLE' not in content or b'crm_private' not in content):
                raise RuntimeError('Schema dump is missing CRM tables or private access functions')
            if filename == 'data.sql' and (b'COPY public.admin ' not in content and b'COPY "public"."admin" ' not in content):
                raise RuntimeError('Data dump is missing the customer table')
            manifest['files'][filename] = {'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
        (folder / 'manifest.json').write_text(json.dumps(manifest, indent=2))
        archive = folder / 'database.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            for filename in [*commands, 'manifest.json']:
                tar.add(folder / filename, arcname=filename)
        encrypted = folder / 'database.tar.gz.gpg'
        gpg = ['gpg', '--batch', '--yes', '--pinentry-mode', 'loopback', '--passphrase-fd', '0']
        run([*gpg, '--symmetric', '--cipher-algo', 'AES256', '--output', str(encrypted), str(archive)], input=passphrase.encode())
        verified = folder / 'verified.tar.gz'
        run([*gpg, '--decrypt', '--output', str(verified), str(encrypted)], input=passphrase.encode())
        if hashlib.sha256(verified.read_bytes()).digest() != hashlib.sha256(archive.read_bytes()).digest():
            raise RuntimeError('Encrypted backup round-trip verification failed')
        target = destination / datetime.now(timezone.utc).strftime('%Y/%m/%d')
        target.mkdir(parents=True, exist_ok=True)
        output = target / f'{timestamp}-{os.environ.get("GITHUB_RUN_ID", "manual")}-{os.environ.get("GITHUB_RUN_ATTEMPT", "1")}.tar.gz.gpg'
        if encrypted.stat().st_size > 90 * 1024 * 1024:
            raise RuntimeError('Backup exceeds repository file budget; move backups to private object storage')
        output.write_bytes(encrypted.read_bytes())
        output.with_suffix(output.suffix + '.sha256').write_text(hashlib.sha256(output.read_bytes()).hexdigest() + '  ' + output.name + '\n')
        print('Encrypted database backup created; decryption and checksum verified.')


if __name__ == '__main__':
    try:
        if sys.argv[1:] == ['check-repo']:
            check_private_repo()
        elif sys.argv[1:] == ['keep-alive']:
            keep_alive()
        elif len(sys.argv) == 3 and sys.argv[1] == 'backup':
            backup(sys.argv[2])
        else:
            raise RuntimeError('Usage: maintenance.py check-repo | keep-alive | backup DESTINATION')
    except Exception as exc:
        # HTTP/tool exceptions may include URLs and secrets; expose only our explicit diagnostics.
        print(str(exc) if type(exc) is RuntimeError else 'Maintenance failed; check secrets, connectivity and service availability.', file=sys.stderr)
        sys.exit(1)
