import { DEFAULT_FINANCIAL_YEAR, financialYearLabel, availableYears, matchesPeriod } from '../financialYear.js';
import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { permissionsFor } from '../access';
import { exportSheets, downloadExportWorkbook } from '../exportWorkbook.js';

export default function ExportView({ records, initialYear, onYearChange, selectedMonth = 'All', onMonthChange, userType, disabled }) {
    const access = permissionsFor(userType);
    const [selection, setSelection] = useState(access.crm && access.finance ? 'all' : access.crm ? 'customers' : 'finance');
    const year = initialYear ?? String(DEFAULT_FINANCIAL_YEAR);
    const setYear = onYearChange;
    const [previewName, setPreviewName] = useState('');
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const selectedRecords = records.filter(record => matchesPeriod(record, year, selectedMonth));
    const years = availableYears(records);
    const sheets = useMemo(() => exportSheets(selectedRecords, userType, selection), [selectedRecords, userType, selection]);
    const preview = sheets.find(sheet => sheet.name === previewName) || sheets[0];
    const count = preview?.rows.length || 0;
    const options = [
        ...(access.crm && access.finance ? [{ id: 'all', label: 'Export All', detail: 'Customers + Financial · two tabs' }] : []),
        ...(access.crm ? [{ id: 'customers', label: 'Export Customers', detail: 'Customer and project information' }] : []),
        ...(access.finance ? [{ id: 'finance', label: 'Export Finance', detail: 'Quotations, payments and subsidy' }] : []),
    ];
    async function download() {
        if (exporting || disabled || !count) return;
        setExporting(true); setError(''); setMessage('');
        try {
            await downloadExportWorkbook(selectedRecords, userType, selection, year);
            setMessage(`Download started: ${count} records in ${sheets.length} ${sheets.length === 1 ? 'sheet' : 'sheets'}.`);
        } catch (err) { setError(err.message || 'Export failed. Please try again.'); }
        finally { setExporting(false); }
    }
    return (
        <div className="space-y-6 min-w-0">
            <div>
                <h1 className="text-xl font-semibold text-stone-900">Prepare your export</h1>
                <p className="mt-2 text-sm text-stone-500">Choose your sheets, review the records, then download an Excel workbook.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" role="group" aria-label="Export type">
                {options.map(option => <button key={option.id} onClick={() => { setSelection(option.id); setMessage(''); }} aria-pressed={selection === option.id}
                    className={`text-left p-6 rounded-3xl border-2 transition-colors ${selection === option.id ? 'border-amber-400 bg-amber-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}>
                    <FileSpreadsheet className="w-6 h-6 text-amber-600 mb-3" />
                    <span className="block text-lg font-semibold text-stone-900">{option.label}</span>
                    <span className="block mt-1 text-sm text-stone-500">{option.detail}</span>
                </button>)}
            </div>
            <section className="bg-white rounded-2xl p-5 border border-stone-100 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[auto_auto_1fr_auto] items-end gap-4">
                <div>
                    <label htmlFor="export-financial-year" className="block text-sm font-semibold text-stone-700 mb-2">Financial year · April–March</label>
                    <select id="export-financial-year" value={year} onChange={e => {setYear(e.target.value);setMessage('');}} className="border border-stone-200 rounded-xl px-4 py-3 text-sm bg-white w-full">
                        <option value="All">All financial years</option>
                        {years.map(y => <option key={y} value={y}>FY {financialYearLabel(y)}</option>)}
                        <option value="Unknown">Unassigned year</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="export-month" className="block text-sm font-semibold text-stone-700 mb-2">Month</label>
                    <select id="export-month" value={selectedMonth} onChange={e => {onMonthChange(e.target.value);setMessage('');}} className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm bg-white">
                        <option value="All">All months</option>
                        {[['3','April'],['4','May'],['5','June'],['6','July'],['7','August'],['8','September'],['9','October'],['10','November'],['11','December'],['0','January'],['1','February'],['2','March']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </div>

                    <p className="text-sm text-stone-600 xl:text-right pb-3 whitespace-nowrap"><strong className="text-stone-900">{count}</strong> records · {sheets.length} {sheets.length === 1 ? 'sheet' : 'sheets'}</p>
                    <button onClick={download} disabled={disabled || exporting || !count} className="flex items-center gap-2 rounded-2xl bg-stone-900 text-white px-6 py-3 text-sm font-semibold disabled:opacity-40">
                        <Download size={18} />{exporting ? 'Preparing…' : 'Download Excel'}
                    </button>
            </section>
            <p className="text-sm text-stone-500">Both sheets use the financial year in the CRN (for example, PT 26-27 = FY 2026–27). Financial amounts include the full payment history of those customers, including payments in other years.</p>
            {error && <p role="alert" className="rounded-2xl p-4 bg-red-50 text-red-700">{error}</p>}
            {message && <p role="status" className="rounded-2xl p-4 bg-emerald-50 text-emerald-700">{message}</p>}
            <section className="bg-white rounded-3xl border border-stone-100 overflow-hidden min-w-0">
                <div className="p-6 flex flex-wrap items-center justify-between gap-3">
                    <div><h2 className="text-lg font-semibold text-stone-900">Workbook preview</h2><p className="text-sm text-stone-500 mt-1">First {Math.min(count, 10)} of {count} records. Download includes every matching record.</p></div>
                    <div className="flex gap-2" role="group" aria-label="Preview sheet">{sheets.map(sheet => <button key={sheet.name} onClick={() => setPreviewName(sheet.name)} aria-pressed={preview.name === sheet.name}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold ${preview.name === sheet.name ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>{sheet.name}</button>)}</div>
                </div>
                <div className="overflow-auto max-h-[460px]" tabIndex={0} role="region" aria-label={`${preview.name} sheet preview`}>
                    <table className="text-sm border-collapse w-max min-w-full">
                        <thead className="sticky top-0 bg-stone-100"><tr>{preview.columns.map((col, i) => <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-stone-600 whitespace-nowrap">{col.header}</th>)}</tr></thead>
                        <tbody>{preview.rows.slice(0, 10).map((row, i) => <tr key={i} className="border-t border-stone-100 even:bg-stone-50/50">{row.map((value, j) => <td key={j} title={String(value)} className="px-4 py-3 max-w-[320px] truncate text-stone-700">{String(value)}</td>)}</tr>)}</tbody>
                    </table>
                    {!count && <p className="p-8 text-stone-500">{disabled ? 'Records are loading or unavailable.' : 'No records match this selection.'}</p>}
                </div>
            </section>
        </div>
    );
}
