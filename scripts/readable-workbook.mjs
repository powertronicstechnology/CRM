import fs from 'node:fs/promises';
import { buildExportWorkbook } from '../src/exportWorkbook.js';
const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('Expected source JSON and output workbook paths');
const records = JSON.parse(await fs.readFile(source, 'utf8'));
for (const record of records) {
    for (const field of Object.keys(record)) {
        if (/^(quoted_amount(?:_[23])?|total_received|receivables|system_capacity_kwp|payment_[1-5])$/.test(field) && record[field] !== null && record[field] !== '' && Number.isFinite(Number(record[field]))) {
            record[field] = Number(record[field]);
        }
    }
}
const workbook = await buildExportWorkbook(records, 'admin', 'all');
await workbook.xlsx.writeFile(destination);
// Read the actual output back and verify both sheet names and record counts.
const { default: ExcelJS } = await import('exceljs');
const checked = new ExcelJS.Workbook();
await checked.xlsx.readFile(destination);
const expected = records.filter(record => !record.deleted_at).length;
if (checked.worksheets.length !== 2 || checked.worksheets.some((sheet, i) => sheet.name !== ['Customers', 'Financial'][i] || sheet.rowCount !== expected + 1)) {
    throw new Error('Readable workbook verification failed');
}
console.log('Readable workbook verified.');
