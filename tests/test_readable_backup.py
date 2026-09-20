import csv
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('readable_backup',Path(__file__).parents[1]/'scripts/readable_backup.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ReadableTests(unittest.TestCase):
    def test_all_public_rows_escapes_and_private_exclusion(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);dump=root/'data.sql'
            dump.write_text('COPY auth.users (id, password) FROM stdin;\nx\tsecret\n\\.\nCOPY public.admin (id, customer_name, phone_number, internal_remarks, deleted_at) FROM stdin;\n1\tExample, "Client"\t00123\tline\\nnext\\tcell\\\\end\t\\N\n2\tDeleted\t00456\t\t2026-01-01\n\\.\nCOPY public.metadata (id, label) FROM stdin;\n'+''.join(f'{i}\tValue {i}\n' for i in range(1501))+'\\.\n')
            counts=m.create_readable_files(dump,root/'readable')
            self.assertEqual(counts,{'admin':2,'metadata':1501})
            with (root/'readable/admin.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.reader(f))
            self.assertEqual(rows[1][1],'Example, "Client"');self.assertEqual(rows[1][2],'00123')
            self.assertEqual(rows[1][3],'line\nnext\tcell\\end')
            self.assertFalse((root/'readable/users.csv').exists())
            self.assertIsNone(json.loads((root/'readable/customers-source.json').read_text())[0]['deleted_at'])
    def test_truncated_and_malformed_dumps_fail(self):
        for contents in ['COPY public.admin (id) FROM stdin;\n1\n','COPY public.admin (id, name) FROM stdin;\n1\n\\.\n','COPY auth.users (id) FROM stdin;\n1\n\\.\n']:
            with tempfile.TemporaryDirectory() as temp:
                path=Path(temp)/'data.sql';path.write_text(contents)
                with self.assertRaises(RuntimeError):m.public_tables(path)
