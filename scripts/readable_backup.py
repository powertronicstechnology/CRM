"""Extract public application tables from pg_dump COPY data without executing SQL."""
import csv
import json
import re
from pathlib import Path

IDENT = r'(?:"(?:[^"]|"")+"|[a-zA-Z_][a-zA-Z0-9_$]*)'
HEADER = re.compile(r'^COPY (' + IDENT + r')\.(' + IDENT + r') \((.*)\) FROM stdin;$')

def identifier(value):
    return value[1:-1].replace('""', '"') if value.startswith('"') else value

def unescape(value):
    if value == r'\N':
        return None
    def decode(match):
        code = match.group(1)
        if code.startswith('x'):
            return chr(int(code[1:], 16))
        if code[0] in '01234567':
            return chr(int(code, 8))
        return {'b':'\b', 'f':'\f', 'n':'\n', 'r':'\r', 't':'\t', 'v':'\v', '\\':'\\'}.get(code, code)
    return re.sub(r'\\(x[0-9a-fA-F]{1,2}|[0-7]{1,3}|.)', decode, value)

def public_tables(path):
    tables = {}
    current = None
    with Path(path).open(encoding='utf-8', newline='') as source:
        for raw in source:
            line = raw.rstrip('\r\n')
            if current is not None:
                if line == r'\.':
                    current = None
                    continue
                if current is False:
                    continue
                columns, rows = current
                cells = line.split('\t')
                if len(cells) != len(columns):
                    raise RuntimeError('Readable backup found a malformed COPY row')
                rows.append([unescape(cell) for cell in cells])
                continue
            match = HEADER.match(line)
            if not match:
                continue
            schema, name, fields = match.groups()
            if identifier(schema) != 'public':
                current = False
                continue
            name = identifier(name)
            if not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', name) or name in tables:
                raise RuntimeError('Readable backup encountered an unsupported or duplicate table name')
            columns = [identifier(part.strip()) for part in re.findall(IDENT, fields)]
            tables[name] = (columns, [])
            current = tables[name]
    if current is not None or 'admin' not in tables:
        raise RuntimeError('Readable backup is incomplete or missing the customer table')
    return tables

def create_readable_files(dump, destination):
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)
    tables = public_tables(dump)
    counts = {}
    for name, (columns, rows) in tables.items():
        with (destination / f'{name}.csv').open('w', encoding='utf-8-sig', newline='') as output:
            writer = csv.writer(output)
            writer.writerow(columns)
            writer.writerows(rows)
        counts[name] = len(rows)
    columns, rows = tables['admin']
    records = [dict(zip(columns, row)) for row in rows]
    (destination / 'customers-source.json').write_text(json.dumps(records), encoding='utf-8')
    (destination / 'row-counts.json').write_text(json.dumps(counts, indent=2), encoding='utf-8')
    (destination / 'README.txt').write_text(
        'Readable application data from the same database dump as the encrypted recovery archive.\n'
        'POWERTRONICS_YYYY-MM-DD.xlsx (India date): active customers, Customers and Financial tabs matching the CRM export.\n'
        'CSV files: all dumped public application tables, including soft-deleted records.\n'
        'Auth credentials and private/internal schemas are excluded from readable files.\n'
        'CSV values are stored as text; blank cells represent SQL NULL or empty text.\n'
        'Import identifier columns as text to preserve phone numbers and leading zeros.\n'
        'An upload target may require column mapping; these files are not a complete CRM restore.\n'
        'Use the encrypted SQL archive for faithful database recovery.\n', encoding='utf-8')
    return counts
