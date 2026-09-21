import QuotationValue from './QuotationValue.jsx';
// ─── SubsidyView.jsx ─────────────────────────────────────────────────────────
// Dedicated Subsidy Dashboard View: Summary metrics, status filter cards,
// and customer listings grouped by subsidy status (Applied, Claimed, Returned, Received).
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Tag, ArrowUpRight } from 'lucide-react';
import { formatDate } from '../utils';

const SUBSIDY_TAGS = [
    { id: 'Applied',  label: 'Applied',  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500' },
    { id: 'Claimed',  label: 'Claimed',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500' },
    { id: 'Returned', label: 'Returned', bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500' },
    { id: 'Received', label: 'Received', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
];

export function getCustomerSubsidyStatus(c) {
    if (Array.isArray(c.subsidy_history) && c.subsidy_history.length > 0) {
        const latest = c.subsidy_history[c.subsidy_history.length - 1];
        if (latest && latest.status) return latest.status;
    }
    if (c.subsidy_received) return 'Received';
    if (c.subsidy_claim) return 'Claimed';
    return null;
}

export default function SubsidyView({ customers = [], onSelectCustomer }) {
    const [activeFilter, setActiveFilter] = useState(null);

    // Active non-deleted customers with any subsidy data (status or dates)
    const subsidyCustomers = customers.filter(c => {
        if (c.deleted_at) return false;
        const status = getCustomerSubsidyStatus(c);
        return status || c.subsidy_claim || c.subsidy_received;
    });

    const totalCapacityKwp = subsidyCustomers.reduce((acc, c) => acc + (Number(c.system_capacity_kwp) || 0), 0);

    // Grouping by status
    const grouped = SUBSIDY_TAGS.reduce((acc, tag) => {
        const group = subsidyCustomers.filter(c => {
            const status = getCustomerSubsidyStatus(c);
            if (status) return status === tag.id;
            if (tag.id === 'Received' && c.subsidy_received) return true;
            if (tag.id === 'Claimed' && c.subsidy_claim && !c.subsidy_received) return true;
            return false;
        });
        if (group.length > 0) acc[tag.id] = group;
        return acc;
    }, {});

    const filteredTags = SUBSIDY_TAGS.filter(t => !activeFilter || activeFilter === t.id);

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Combined summary and status filters */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <button
                    aria-pressed={activeFilter === null}
                    onClick={() => setActiveFilter(null)}
                    className={`rounded-2xl p-4 border text-left transition-all ${
                        activeFilter === null
                            ? 'bg-stone-900 border-stone-900 text-white shadow-md'
                            : 'bg-white border-stone-100 text-stone-800 hover:border-stone-200'
                    }`}
                >
                    <p className="text-xs font-semibold uppercase tracking-wide mb-0.5 opacity-70">All Subsidy</p>
                    <p className="text-2xl font-semibold">{subsidyCustomers.length}</p>
                    <p className="text-xs mt-1 opacity-70">{totalCapacityKwp.toFixed(2)} kWp combined</p>
                </button>

                {SUBSIDY_TAGS.map(tag => {
                    const count = (grouped[tag.id] || []).length;
                    const isSelected = activeFilter === tag.id;
                    return (
                        <button
                            key={tag.id}
                            aria-pressed={isSelected}
                            onClick={() => setActiveFilter(isSelected ? null : tag.id)}
                            className={`rounded-2xl p-4 border text-left transition-all ${
                                isSelected ? 'ring-2 ring-stone-900 ring-offset-2' : ''
                            } ${tag.bg} ${tag.border}`}
                        >
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${tag.text}`}>{tag.label}</p>
                            <p className={`text-2xl font-semibold ${tag.text}`}>{count}</p>
                            <p className={`text-xs mt-1 ${tag.text}`}>{({Applied: 'Application submitted', Claimed: 'Awaiting disbursement', Returned: 'Needs correction', Received: 'Disbursement received'})[tag.id]}</p>
                        </button>
                    );
                })}
            </div>

            {/* Grouped Customer Cards */}
            {filteredTags.every(tag => !grouped[tag.id]) && (
                <div className="flex flex-col items-center justify-center py-14 text-stone-400 bg-white rounded-2xl border border-stone-100 shadow-sm">
                    <Tag className="w-8 h-8 mb-2 text-stone-300" />
                    <p className="text-sm font-semibold text-stone-600">No customers found in this subsidy status</p>
                </div>
            )}

            {filteredTags.map(tag => {
                const group = grouped[tag.id];
                if (!group) return null;

                return (
                    <div key={tag.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tag.dot}`} />
                            <h3 className="text-xs font-semibold text-stone-800 uppercase tracking-wider">{tag.label}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${tag.bg} ${tag.text} ${tag.border}`}>
                                {group.length}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.map(c => {
                                const status = getCustomerSubsidyStatus(c) || tag.id;

                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => onSelectCustomer(c)}
                                        className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm hover:shadow-md hover:border-amber-300/80 transition-all cursor-pointer group flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-semibold text-stone-800 group-hover:text-amber-700 transition-colors truncate">
                                                        {c.customer_name}
                                                    </h4>
                                                    <p className="text-xs text-stone-400 font-mono mt-0.5">
                                                        {c.crn || 'NO-CRN'} {c.area ? `· ${c.area}` : ''}
                                                    </p>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider border flex-shrink-0 ${tag.bg} ${tag.text} ${tag.border}`}>
                                                    {status}
                                                </span>
                                            </div>

                                            {/* Details row */}
                                            <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                                                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                                                    <p className="text-xs text-stone-400 uppercase font-semibold">Capacity</p>
                                                    <p className="font-semibold text-stone-700">⚡ {c.system_capacity_kwp || '–'} kWp</p>
                                                </div>
                                                <div className="bg-stone-50 p-2 rounded-xl border border-stone-100">
                                                    <p className="text-xs text-stone-400 uppercase font-semibold">Quoted</p>
                                                    <p className="font-semibold text-stone-700"><QuotationValue record={c} /></p>
                                                </div>
                                            </div>

                                            {/* Dates */}
                                            <div className="space-y-1 text-xs text-stone-500 pt-1 border-t border-stone-50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-stone-400">Claim Date:</span>
                                                    <span className="font-semibold text-stone-700">{c.subsidy_claim ? formatDate(c.subsidy_claim) : '–'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-stone-400">Received Date:</span>
                                                    <span className="font-semibold text-emerald-700">{c.subsidy_received ? formatDate(c.subsidy_received) : '–'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100 text-xs text-stone-400 font-semibold">
                                            <span>{c.project_type || 'General'}</span>
                                            <span className="flex items-center gap-0.5 text-amber-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                                                View Details <ArrowUpRight size={12} />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
