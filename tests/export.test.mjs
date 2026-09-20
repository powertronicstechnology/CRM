import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import { buildExportWorkbook, exportSheets, CUSTOMER_COLUMNS } from '../src/exportWorkbook.js';

const fixture = {
    id: 'record-1', crn: 'PT 26-27=001', customer_name: '=SUM(1,2)',
    stage: 'SUBSIDY AMOUNT DISBURSED', phone_number: '09876543210',
    consumer_number: '0001234567890123456', application_no: '001234', subdivision: 'West',
    quoted_amount: 0, total_received: 0, receivables: -100, payment_1: 0,
    meter_instaled: false, internal_remarks: 'CRM private notes',
    payment_notes: { formula: 'HYPERLINK("https://example.com")' },
    payments: [{ amount: 0, date: '2026-09-20' }], deleted_at: null,
    unexpected_secret: 'must not export',
};
const value = (sheet, heading, row = 2) => {
    const col = sheet.getRow(1).values.indexOf(heading);
    assert.ok(col > 0, `Missing header: ${heading}`);
    return sheet.getRow(row).getCell(col).value;
};
async function roundTrip(role, records = [fixture, { ...fixture, id: 'deleted', deleted_at: '2026-09-20' }]) {
    const built = await buildExportWorkbook(records, role);
    const read = new ExcelJS.Workbook();
    await read.xlsx.load(await built.xlsx.writeBuffer());
    return read;
}

test('Admin and Staff get both real Excel sheets with customer column order and faithful values', async () => {
    for (const role of ['admin', 'staff']) {
        const workbook = await roundTrip(role);
        assert.deepEqual(workbook.worksheets.map(s => s.name), ['Customers', 'Financial']);
        const [customers, financial] = workbook.worksheets;
        assert.deepEqual(customers.getRow(1).values.slice(1), CUSTOMER_COLUMNS.map(c => c.header));
        assert.equal(customers.rowCount, 2);
        assert.equal(financial.rowCount, 2);
        assert.equal(value(customers, 'NAME'), '=SUM(1,2)');
        assert.equal(value(customers, 'MOBILE NO'), '09876543210');
        assert.equal(value(customers, 'CONSUMER NUMBER'), '0001234567890123456');
        assert.equal(value(customers, 'APPLICATION NO'), '001234');
        assert.equal(value(customers, 'SUBDIVISION'), 'West');
        assert.equal(value(customers, 'QUOTATION AMOUNT'), 0);
        assert.equal(value(customers, 'METER INSTALED'), 'No');
        assert.equal(value(financial, 'TOTAL RECEIVED'), 0);
        assert.equal(value(financial, 'RECEIVABLES'), 0);
        assert.equal(value(financial, 'PAYMENT 1'), 0);
        assert.equal(value(financial, 'PAYMENT NOTES'), JSON.stringify(fixture.payment_notes));
        assert.equal(value(financial, 'RECORD ID'), value(customers, 'RECORD ID'));
        assert.equal(customers.views[0].state, 'frozen');
        assert.ok(customers.autoFilter);
        assert.ok(!JSON.stringify(workbook.model).includes('must not export'));
    }
});

test('Paused roles cannot export even when supplied full records', async () => {
    for (const role of ['accounts', 'manager', 'agent', undefined]) {
        await assert.rejects(buildExportWorkbook([fixture], role), /cannot export/);
    }
});

test('Empty selections still produce two usable header-only tabs', async () => {
    const workbook = await roundTrip('admin', []);
    assert.equal(workbook.worksheets.length, 2);
    for (const sheet of workbook.worksheets) assert.equal(sheet.rowCount, 1);
});


test('Sheet selections match the preview and reject unauthorized exports', async () => {
    for (const [selection, names] of [['all', ['Customers', 'Financial']], ['customers', ['Customers']], ['finance', ['Financial']]]) {
        const records = [fixture, { ...fixture, deleted_at: '2026-09-20' }];
        const preview = exportSheets(records, 'admin', selection);
        const built = await buildExportWorkbook(records, 'admin', selection);
        const loaded = new ExcelJS.Workbook();
        await loaded.xlsx.load(await built.xlsx.writeBuffer());
        assert.deepEqual(loaded.worksheets.map(s => s.name), names);
        for (const sheet of preview) {
            assert.equal(sheet.rows.length, 1);
            assert.deepEqual(loaded.getWorksheet(sheet.name).getRow(2).values.slice(1), sheet.rows[0]);
        }
    }
    assert.equal(exportSheets([fixture], 'staff', 'finance')[0].name, 'Financial');
    assert.throws(() => exportSheets([fixture], 'accounts', 'customers'), /cannot export/);
    assert.throws(() => exportSheets([fixture], 'admin', 'invalid'), /Unknown/);
});
