// ─── FinancialView.jsx ────────────────────────────────────────────────────────
// Displays all customers that have a financial_tag set, grouped by tag type.
// Shows money totals and individual cards with quoted/received/pending amounts.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Tag } from 'lucide-react';
import { FINANCIAL_TAGS, FINANCIAL_TAG_COLORS } from '../constants';

export default function FinancialView({ customers, onSelectCustomer }) {
    const [activeFilter, setActiveFilter] = useState(null);

    const tagged = customers.filter(c => c.financial_tag);

    const totals = tagged.reduce((acc, c) => {
        acc.quoted    += (Number(c.quoted_amount) || 0);
        acc.received  += (Number(c.total_received) || 0);
        acc.receivable += (Number(c.receivables) || 0);
        return acc;
    }, { quoted: 0, received: 0, receivable: 0 });

    const grouped = FINANCIAL_TAGS.reduce((acc, tag) => {
        const group = tagged.filter(c => c.financial_tag === tag.id);
        if (group.length > 0) acc[tag.id] = group;
        return acc;
    }, {});

    if (tagged.length === 0) return (
        <div className="flex flex-col items-center justify-center h-64 text-stone-400">
            <Tag className="w-10 h-10 mb-3 text-stone-300" />
            <p className="font-medium text-stone-500 text-sm">No financial tags active</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Money summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Quoted</p>
                    <p className="text-2xl font-bold text-stone-800">₹{(totals.quoted / 100000).toFixed(2)}L</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Received</p>
                    <p className="text-2xl font-bold text-emerald-600">₹{(totals.received / 100000).toFixed(2)}L</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm border-b-4 border-b-orange-400">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Receivable</p>
                    <p className="text-2xl font-bold text-orange-600">₹{(totals.receivable / 100000).toFixed(2)}L</p>
                </div>
            </div>

            {/* Tag filter buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button onClick={() => setActiveFilter(null)}
                    className={`rounded-2xl p-4 border text-left transition-all ${activeFilter === null ? 'bg-stone-900 border-stone-900 text-white shadow-lg' : 'bg-white border-stone-100 text-stone-800 hover:border-stone-200'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">All Tagged</p>
                    <p className="text-2xl font-bold">{tagged.length}</p>
                </button>
                {FINANCIAL_TAGS.map(tag => {
                    const groupCount = (grouped[tag.id] || []).length;
                    if (groupCount === 0) return null;
                    const colors = FINANCIAL_TAG_COLORS[tag.id] || {};
                    const isSelected = activeFilter === tag.id;
                    return (
                        <button key={tag.id} onClick={() => setActiveFilter(isSelected ? null : tag.id)}
                            className={`rounded-2xl p-3 border transition-all text-left ${isSelected ? 'ring-2 ring-stone-900 ring-offset-2' : ''} ${colors.bg} ${colors.border}`}>
                            <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${colors.text}`}>{tag.label}</p>
                            <p className={`text-xl font-bold ${colors.text}`}>{groupCount}</p>
                        </button>
                    );
                })}
            </div>

            {/* Grouped listing */}
            {FINANCIAL_TAGS.filter(tag => !activeFilter || activeFilter === tag.id).map(tag => {
                const group = grouped[tag.id];
                if (!group) return null;
                const colors = FINANCIAL_TAG_COLORS[tag.id] || {};
                return (
                    <div key={tag.id} className="animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-widest">{tag.label}</h3>
                            <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>{group.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.map(c => {
                                const recv = Number(c.receivables) || 0;
                                const totalRec = Number(c.total_received) || 0;
                                return (
                                    <button key={c.id} onClick={() => onSelectCustomer(c)}
                                        className="w-full bg-white rounded-2xl border border-stone-100 p-4 text-left hover:border-amber-200 hover:shadow-sm transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-bold text-stone-800 text-sm group-hover:text-amber-600 transition-colors">{c.customer_name}</p>
                                                <p className="text-[10px] text-stone-400 font-medium mt-0.5">{c.crn || 'No CRN'} · {c.location || 'No Location'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-50">
                                            <div>
                                                <p className="text-[9px] text-stone-400 font-bold uppercase">Quoted</p>
                                                <p className="text-xs font-bold text-stone-700">₹{(Number(c.quoted_amount || 0) / 1000).toFixed(0)}k</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-stone-400 font-bold uppercase">Received</p>
                                                <p className="text-xs font-bold text-emerald-600">₹{(totalRec / 1000).toFixed(0)}k</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-stone-400 font-bold uppercase">Pending</p>
                                                <p className={`text-xs font-bold ${recv > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>₹{(recv / 1000).toFixed(0)}k</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
