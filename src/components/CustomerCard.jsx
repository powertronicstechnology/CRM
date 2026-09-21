import { ArrowUpRight, MapPin, Zap } from 'lucide-react';
import { receivableAmount } from '../quotation.js';
import { formatIndianCurrency } from '../utils';

// Overview only; detailed information and stage editing live in the customer record.
export default function CustomerCard({ customer, onSelect, canSeeFinance = false }) {
    const outstanding = receivableAmount(customer);
    return (
        <button
            type="button"
            onClick={() => onSelect(customer)}
            aria-label={`Open customer ${customer.customer_name || customer.crn || ''}`}
            className="group w-full h-[200px] min-w-0 text-left bg-white rounded-[22px] border border-stone-100 border-l-4 border-l-amber-400 shadow-sm hover:shadow-md hover:border-l-amber-500 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 px-5 py-4 flex flex-col"
        >
            <span className="flex items-start justify-between gap-3 min-h-10">
                <span title={customer.customer_name} className="min-w-0 line-clamp-2 break-words text-base font-semibold text-stone-800 leading-5">
                    {customer.customer_name || 'Unnamed customer'}
                </span>
                <span title={customer.crn} className="shrink-0 max-w-[132px] truncate rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-500">
                    {customer.crn || 'No CRN'}
                </span>
            </span>
            <span className="flex items-center gap-4 mt-3 text-sm text-stone-600">
                <span className="flex items-center gap-1.5 min-w-0 flex-1">
                    <MapPin size={14} className="shrink-0 text-stone-400" />
                    <span title={customer.area} className="truncate">{customer.area || 'Area not added'}</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                    <Zap size={14} className="text-amber-500" />
                    {customer.system_capacity_kwp ? `${customer.system_capacity_kwp} kWp` : 'Capacity not added'}
                </span>
            </span>
            <span className="mt-auto pt-3 border-t border-stone-100 flex items-end justify-between gap-3">
                {canSeeFinance && <span>
                    <span className="block text-xs text-stone-500 mb-0.5">Outstanding</span>
                    <span className={`text-base tabular-nums font-semibold ${outstanding > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatIndianCurrency(outstanding, false)}
                    </span>
                </span>}
                <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-stone-700 group-hover:text-stone-900">
                    Open customer <ArrowUpRight size={16} />
                </span>
            </span>
        </button>
    );
}
