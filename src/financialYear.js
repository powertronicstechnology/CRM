// Indian financial years run from April 1 through March 31.
export const DEFAULT_FINANCIAL_YEAR = 2026;
export function indiaDate(value = new Date()) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(date);
    return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
}
export function financialYear(value = new Date()) {
    const date = indiaDate(value);
    return date ? date.year - (date.month < 4 ? 1 : 0) : null;
}
export const financialYearLabel = year => `${year}–${String(Number(year) + 1).slice(-2)}`;
export function customerYear(record) {
    const match = String(record.crn || '').match(/^\s*PT\s*(\d{4}|\d{2})\s*[-–]\s*(\d{4}|\d{2})(?=\s*(?:[=/]|$))/i);
    if (match) {
        const start = Number(match[1]) + (match[1].length === 2 ? 2000 : 0);
        if ((start + 1) % 100 === Number(match[2]) % 100) return start;
    }
    return null;
}
export const availableYears = records => [...new Set([DEFAULT_FINANCIAL_YEAR, ...records.map(customerYear).filter(y => y !== null)])].sort((a,b) => b-a);
export function matchesPeriod(record, year = 'All', month = 'All') {
    if (year === 'Unknown' ? customerYear(record) !== null : year !== 'All' && customerYear(record) !== Number(year)) return false;
    if (month === 'All') return true;
    const date = indiaDate(record.date_of_registration || record.date || record.created_at || 'invalid');
    return date?.month === Number(month) + 1;
}
export function exportFilename(selection, year = 'All', now = new Date()) {
    const date = indiaDate(now);
    const stamp = `${date.year}-${String(date.month).padStart(2,'0')}-${String(date.day).padStart(2,'0')}`;
    const period = year === 'All' ? 'AllYears' : year === 'Unknown' ? 'UnassignedYear' : `FY${financialYearLabel(year).replace('–','-')}`;
    return `POWERTRONICS_${period}_${selection === 'all' ? 'Customers_Financial' : selection === 'finance' ? 'Financial' : 'Customers'}_${stamp}.xlsx`;
}
