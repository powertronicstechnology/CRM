import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('maintenance', Path(__file__).parents[1] / 'scripts/maintenance.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class MaintenanceTests(unittest.TestCase):
    def test_keep_alive_uses_authorized_metadata_query(self):
        with patch.dict(os.environ, {'SUPABASE_URL':'https://example.supabase.co','SUPABASE_SERVICE_ROLE_KEY':'test-key'}), patch.object(m, 'request_json', return_value=[]) as request:
            m.keep_alive()
            url, headers = request.call_args.args
            self.assertIn('/metadata?select=id&limit=1', url)
            self.assertEqual(headers['Authorization'], 'Bearer test-key')
    def test_keep_alive_rejects_error_payload(self):
        with patch.dict(os.environ, {'SUPABASE_URL':'https://example.supabase.co','SUPABASE_SERVICE_ROLE_KEY':'test-key'}), patch.object(m, 'request_json', return_value={'error':'bad'}):
            with self.assertRaises(RuntimeError): m.keep_alive()
    def test_private_repository_required(self):
        with patch.dict(os.environ, {'BACKUP_REPO':'team/backups','BACKUP_PAT':'test-token'}):
            for info in [{'private':False}, {'private':True,'full_name':'different/repo'}, {'private':True,'full_name':'team/backups','permissions':{'push':False}}]:
                with patch.object(m, 'request_json', return_value=info), self.assertRaises(RuntimeError): m.check_private_repo()
            with patch.object(m, 'request_json', return_value={'private':True,'full_name':'team/backups','permissions':{'push':True}}): m.check_private_repo()
    def fake_run(self, command, **kwargs):
        if command[0] == 'supabase':
            path = Path(command[command.index('-f')+1])
            path.write_text({'roles.sql':'CREATE ROLE example;', 'schema.sql':'CREATE TABLE public.admin(); CREATE SCHEMA crm_private;', 'data.sql':'COPY public.admin (id) FROM stdin;\n1\n\\.\n'}[path.name])
        else:
            # This tests orchestration and integrity checks; real GPG runs in GitHub Actions.
            path = Path(command[command.index('--output')+1])
            path.write_bytes(Path(command[-1]).read_bytes())
    def test_backup_only_publishes_verified_encrypted_archive(self):
        env={'SUPABASE_DB_URL':'postgresql://test.invalid/postgres','BACKUP_PASSPHRASE':'x'*40}
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, env), patch.object(m, 'run', side_effect=self.fake_run):
            m.backup(folder)
            files=[p for p in Path(folder).rglob('*') if p.is_file()]
            self.assertEqual(len(files),2)
            self.assertTrue(any(p.name.endswith('.gpg') for p in files))
            self.assertFalse(any(p.name.endswith('.sql') for p in files))
    def test_failed_dump_does_not_publish(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {'SUPABASE_DB_URL':'postgresql://test.invalid/postgres','BACKUP_PASSPHRASE':'x'*40}), patch.object(m,'run',side_effect=RuntimeError('dump failed')):
            with self.assertRaises(RuntimeError): m.backup(folder)
            self.assertEqual(list(Path(folder).iterdir()), [])
    def test_corrupted_encryption_does_not_publish(self):
        def corrupt(command, **kwargs):
            self.fake_run(command, **kwargs)
            if '--decrypt' in command: Path(command[command.index('--output')+1]).write_bytes(b'bad')
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {'SUPABASE_DB_URL':'postgresql://test.invalid/postgres','BACKUP_PASSPHRASE':'x'*40}), patch.object(m,'run',side_effect=corrupt):
            with self.assertRaisesRegex(RuntimeError,'round-trip'): m.backup(folder)
            self.assertEqual(list(Path(folder).iterdir()), [])

if __name__ == '__main__': unittest.main()
