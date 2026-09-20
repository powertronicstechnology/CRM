import { quotationAmount, quotationMismatch } from '../quotation.js';
const money = value => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export default function QuotationValue({ record }) {
    if (!quotationMismatch(record)) return <span className="font-semibold">{money(quotationAmount(record))}</span>;
    return <span className="inline-grid grid-cols-2 gap-x-3 text-sm leading-5">
        <span><span className="block text-stone-500 text-xs">Original</span>{money(record.quoted_amount)}</span>
        <span className="font-semibold text-amber-700"><span className="block text-xs">Finance · used</span>{money(record.quoted_amount_3)}</span>
    </span>;
}
