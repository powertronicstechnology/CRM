"""Build a URL-encoded backup URI locally; copy to macOS clipboard, never print it."""
from getpass import getpass
from urllib.parse import quote, urlsplit
import subprocess

def build_url(template, password):
    if template.count('[YOUR-PASSWORD]') != 1:
        raise ValueError('Copy a fresh Supabase URI containing exactly one [YOUR-PASSWORD] placeholder.')
    if not password:
        raise ValueError('Database password cannot be empty.')
    result = template.strip().replace('[YOUR-PASSWORD]', quote(password, safe=''))
    parsed = urlsplit(result)
    if parsed.scheme not in ('postgres', 'postgresql') or not parsed.hostname or parsed.port != 5432:
        raise ValueError('Use the Session pooler PostgreSQL URI on port 5432.')
    return result

if __name__ == '__main__':
    try:
        template = getpass('Paste fresh Session pooler URI with [YOUR-PASSWORD] (hidden): ')
        password = getpass('Enter database password (hidden): ')
        result = build_url(template, password)
        subprocess.run(['pbcopy'], input=result, text=True, check=True)
        print('Encoded URI copied. Paste into the CRM GitHub secret SUPABASE_DB_URL, save, then rerun the job.')
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print('Could not prepare the URI. Check that the template uses [YOUR-PASSWORD] and Session pooler port 5432.')
        raise SystemExit(1)
