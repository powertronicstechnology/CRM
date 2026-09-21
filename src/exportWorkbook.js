import { exportFilename } from './financialYear.js';
import { quotationAmount, receivableAmount } from './quotation.js';
import { permissionsFor } from './access.js';

const column = (header, field, width = 22) => ({ header, field, width });
export const CUSTOMER_COLUMNS = [
    column('SR. NO', null, 9), column('NAME', 'customer_name', 34),
    column('STATUS', 'stage', 30), column('METER PHASE', 'meter_phase'),
    column('ADDRESS', 'full_installation_address', 48), column('AREA', 'area'),
    column('MOBILE NO', 'phone_number'), column('SYSTEM IN KW', 'system_capacity_kwp'),
    column('PANEL', 'panel'), column('INVERTER', 'inverter'),
    column('CONSUMER NUMBER', 'consumer_number'), column('APPLICATION NO', 'application_no', 28),
    column('QUOTATION AMOUNT', 'effective_quotation'), column('ORIGINAL QUOTATION', 'quoted_amount'), column('FINANCE QUOTATION', 'quoted_amount_3'), column('DATE OF REGISTRATION', 'date_of_registration'),
    column('PAYMENT RECEIPT', 'payment_reciept'), column('FABRICATION AND WIRING', 'fabrication_and_wiring'),
    column('PANEL AND INVERTER', 'panel_and_inverter'), column('METER FILE SUBMISSION', 'meter_file_submission'),
    column('METER INSTALED', 'meter_instaled'), column('SUBSIDY CLAIM', 'subsidy_claim'),
    column('SUBSIDY RECEIVED', 'subsidy_received'), column('FILE GIVEN TO CUSTOMER', 'file_given_to_customer'),
    column('Column 1', undefined), column('Column 2', undefined),
    column('SUBDIVISION', 'subdivision'), column('CRN', 'crn'),
];
const FINANCIAL_COLUMNS = [
    column('SR. NO', null, 9), column('CRN', 'crn'), column('NAME', 'customer_name', 34), column('PROJECT TYPE', 'project_type'),
    column('FINANCIAL TAG', 'financial_tag', 34), column('QUOTATION AMOUNT', 'effective_quotation'), column('ORIGINAL QUOTATION', 'quoted_amount'), column('FINANCE QUOTATION', 'quoted_amount_3'),
    column('QUOTATION AMOUNT 2', 'quoted_amount_2'), column('QUOTATION AMOUNT 3', 'quoted_amount_3'),
    column('TOTAL RECEIVED', 'total_received'), column('RECEIVABLES', 'receivables'),
    column('PAYMENT RECEIPT', 'payment_reciept'), column('PAYMENT NOTES', 'payment_notes', 40),
    column('DATE', 'date'), column('PO NO', 'po_no'), column('BILL NO', 'bill_no'),
    ...Array.from({ length: 5 }, (_, i) => [
        column(`PAYMENT ${i + 1}`, `payment_${i + 1}`),
        column(`PAYMENT DATE ${i + 1}`, `payment_date_${i + 1}`),
        column(`PAYMENT REMARK ${i + 1}`, `payment_remark_${i + 1}`, 34),
    ]).flat(),
    column('PAYMENTS', 'payments', 48), column('SUBSIDY CLAIM', 'subsidy_claim'),
    column('SUBSIDY RECEIVED', 'subsidy_received'), column('SUBSIDY RECEIVED (LEGACY)', 'subsidy_recieved'),
    column('SUBSIDY HISTORY', 'subsidy_history', 48),
    column('CREATED AT', 'created_at', 28), column('UPDATED AT', 'updated_at', 28),
];
// Remaining operational fields accompany finance only when CRM access is also granted.
const OTHER_COLUMNS = [
    'file_ready_to_customer', 'panel_and_inverter_remarks', 'fabrication_and_wiring_remarks',
    'project_checklist', 'follow_ups', 'internal_remarks', 'stages_remarks', 'application_done_by', 'meter_installed',
].map(field => column(field.replaceAll('_', ' ').toUpperCase(), field, 34));

function cellValue(value, field) {
    if (value == null) return '';
    if (['phone_number', 'consumer_number', 'application_no', 'crn', 'id', 'po_no', 'bill_no'].includes(field)) return String(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    // Always use plain text for structured user data, never Excel formula/hyperlink objects.
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
}

export function exportSheets(records, userType, selection = 'all') {
    const access = permissionsFor(userType);
    if (!access.crm && !access.finance) throw new Error('Your role cannot export records.');
    if (!['all', 'customers', 'finance'].includes(selection)) throw new Error('Unknown export selection.');
    if (selection === 'customers' && !access.crm || selection === 'finance' && !access.finance) {
        throw new Error('Your role cannot export this sheet.');
    }
    const active = records.filter(record => !record.deleted_at);
    const sheets = [];
    const add = (name, columns) => sheets.push({ name, columns, rows: active.map((record, index) =>
        columns.map(({ field }) => field === null ? index + 1 : field === undefined ? '' : cellValue(field === 'effective_quotation' ? quotationAmount(record) : field === 'receivables' ? receivableAmount(record) : record[field], field))) });
    if (access.crm && selection !== 'finance') add('Customers', CUSTOMER_COLUMNS);
    if (access.finance && selection !== 'customers') add('Financial', [...FINANCIAL_COLUMNS, ...(access.crm ? OTHER_COLUMNS : [])]);
    return sheets;
}

export async function buildExportWorkbook(records, userType, selection = 'all') {
    const sheets = exportSheets(records, userType, selection);
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'POWERTRONICS';
    function addSheet(name, columns, rows) {
        const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1, xSplit: 2 }] });
        sheet.columns = columns.map(({ header, width }) => ({ header, width }));
        rows.forEach(values => {
            const row = sheet.addRow(values);
            row.alignment = { vertical: 'top', wrapText: true };
            row.eachCell(cell => { if (typeof cell.value === 'string') cell.numFmt = '@'; });
        });
        const header = sheet.getRow(1);
        header.height = 34;
        header.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF292524' } };
            cell.alignment = { vertical: 'middle', wrapText: true };
        });
        sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, sheet.rowCount), column: columns.length } };
    }
    sheets.forEach(({ name, columns, rows }) => addSheet(name, columns, rows));
    return workbook;
}

export async function downloadExportWorkbook(records, userType, selection = 'all', year = 'All') {
    const workbook = await buildExportWorkbook(records, userType, selection);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportFilename(selection, year);
    document.body.appendChild(anchor);
    try { anchor.click(); } finally {
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
}
