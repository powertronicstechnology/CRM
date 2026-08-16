// ─── CustomerCard.jsx ─────────────────────────────────────────────────────────
// Card in the stage grid. Shows name, CRN, capacity, location, POC, phone,
// branch, vendor, docs link, financial tag pill, internal remarks preview,
// money bar (Quoted / Received / Balance), and inline stage-move dropdown.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { Zap, MapPin, User, Building2, Package, FolderOpen, ChevronDown, Sun, Cpu } from 'lucide-react';
import { PRIMARY_STAGES, FINANCIAL_TAGS, FINANCIAL_TAG_COLORS } from '../constants';
import { formatIndianCurrency } from '../utils';

export default function CustomerCard({ customer, onSelect, onMoveStage }) {
    const [showStageMenu, setShowStageMenu] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!showStageMenu) return;
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowStageMenu(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showStageMenu]);

    const totalPaid = Number(customer.total_received) || 0;
    const quotedAmt = Number(customer.quoted_amount || customer.total_cost || 0);
    const balance = quotedAmt - totalPaid;
    const tagColors = customer.financial_tag ? (FINANCIAL_TAG_COLORS[customer.financial_tag] || { bg: 'bg-amber-50/50', text: 'text-stone-700', border: 'border-amber-100', dot: 'bg-amber-400' }) : {};

    return (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-400 group flex flex-col">
            {/* Clickable top section */}
            <div className="p-6 cursor-pointer flex-1" onClick={() => onSelect(customer)}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-base font-extrabold text-stone-800 group-hover:text-amber-600 transition-colors leading-tight">
                        {customer.customer_name}
                    </h3>
                    <span className="text-[10px] bg-stone-100 text-stone-500 px-2.5 py-1 rounded-md font-bold uppercase ml-2 whitespace-nowrap">
                        {customer.crn || 'NO-CRN'}
                    </span>
                </div>

                {/* Badges for Capacity and Project Type */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-100">
                        <Zap size={12} className="flex-shrink-0 text-amber-500" />
                        {customer.system_capacity_kwp ? `${customer.system_capacity_kwp} kWp` : '–'}
                    </span>
                    {customer.project_type && (
                        <span className="inline-flex items-center gap-1.5 bg-stone-50 text-stone-600 px-2.5 py-1 rounded-lg text-xs font-bold border border-stone-100 uppercase">
                            <span>📋</span>
                            {customer.project_type}
                        </span>
                    )}
                </div>

                {/* Details side-by-side in a 2-column grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-stone-600 font-medium mb-4 pt-3 border-t border-stone-100">
                    {customer.phone_number && (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-stone-400 text-xs">📞</span>
                            <span className="truncate">{customer.phone_number}</span>
                        </div>
                    )}
                    {customer.area && (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin size={12} className="text-stone-400 flex-shrink-0" />
                            <span className="truncate">Area: <strong className="text-stone-800 font-bold">{customer.area}</strong></span>
                        </div>
                    )}
                    {customer.panel && (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Sun size={12} className="text-amber-400 flex-shrink-0" />
                            <span className="truncate">Panel: <strong className="text-stone-700 font-semibold">{customer.panel}</strong></span>
                        </div>
                    )}
                    {customer.inverter && (
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Cpu size={12} className="text-stone-400 flex-shrink-0" />
                            <span className="truncate">Inverter: <strong className="text-stone-700 font-semibold">{customer.inverter}</strong></span>
                        </div>
                    )}
                </div>

                {/* Vendor details */}
                {customer.vendor && (
                    <div className="flex items-center gap-2 text-xs text-stone-400 font-semibold">
                        <Package size={12} className="text-stone-300 flex-shrink-0" />
                        <span>Vendor: <strong className="text-stone-500 font-semibold">{customer.vendor}</strong></span>
                    </div>
                )}
            </div>

            {/* Bottom strip — not clickable (stops propagation via parent) */}
            <div className="border-t border-stone-100 bg-stone-50/60 rounded-b-2xl" onClick={e => e.stopPropagation()}>
                {/* Money bar */}
                <div className="grid grid-cols-3 gap-0 divide-x divide-stone-100 px-1 py-3">
                    <div className="text-center px-2">
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wide">Quoted</p>
                        <p className="text-xs font-bold text-stone-700 mt-0.5">{formatIndianCurrency(quotedAmt)}</p>
                    </div>
                    <div className="text-center px-2">
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wide">Received</p>
                        <p className="text-xs font-bold text-emerald-600 mt-0.5">{formatIndianCurrency(totalPaid)}</p>
                    </div>
                    <div className="text-center px-2">
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wide">Balance</p>
                        <p className={`text-xs font-bold mt-0.5 ${balance > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                            {formatIndianCurrency(balance)}
                        </p>
                    </div>
                </div>

                {/* Financial tag pill */}
                {customer.financial_tag && (
                    <div className="px-4 pb-3 border-t border-stone-100 pt-2">
                        <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${tagColors.bg || 'bg-stone-50'} ${tagColors.text || 'text-stone-500'} ${tagColors.border || 'border-stone-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tagColors.dot || 'bg-stone-400'}`} />
                            {customer.financial_tag}
                        </span>
                    </div>
                )}

                {/* Internal remarks preview */}
                {customer.internal_remarks && (
                    <div className="px-4 pb-3 border-t border-stone-100 pt-2">
                        <p className="text-[10px] text-stone-500 italic leading-tight line-clamp-2">
                            💬 {customer.internal_remarks}
                        </p>
                    </div>
                )}

                {/* Stage move dropdown */}
                <div className="px-4 pb-4 pt-2 border-t border-stone-100">
                    <div className="flex gap-2">
                        <div className="relative flex-1" ref={dropdownRef}>
                            <button onClick={() => setShowStageMenu(!showStageMenu)}
                                className="w-full flex items-center justify-between bg-white hover:bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-600 font-semibold transition-colors">
                                <span className="truncate">{PRIMARY_STAGES.find(s => s.id === customer.stage)?.label || customer.stage || 'Move to Stage'}</span>
                                <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-1 transition-transform ${showStageMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showStageMenu && (
                                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-xl border border-stone-100 py-1 z-20 max-h-64 overflow-y-auto">
                                    {PRIMARY_STAGES.map(stage => (
                                        <button key={stage.id}
                                            onClick={() => { onMoveStage(customer.id, stage.id); setShowStageMenu(false); }}
                                            className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-stone-50 transition-colors ${customer.stage === stage.id ? 'bg-amber-50 font-bold text-amber-700' : 'text-stone-600'}`}>
                                            <stage.icon className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
                                            {stage.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Next Stage Arrow Button */}
                        {(() => {
                            const currentIndex = PRIMARY_STAGES.findIndex(s => s.id === customer.stage);
                            const nextStage = currentIndex !== -1 && currentIndex < PRIMARY_STAGES.length - 1 ? PRIMARY_STAGES[currentIndex + 1] : null;
                            return (
                                <button
                                    type="button"
                                    disabled={!nextStage}
                                    onClick={() => nextStage && onMoveStage(customer.id, nextStage.id)}
                                    title={nextStage ? `Move to next stage: ${nextStage.label}` : 'Already at the final stage'}
                                    className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-30 disabled:hover:bg-stone-900 flex items-center justify-center flex-shrink-0 transition-all font-bold text-sm"
                                >
                                    <span className="leading-none">→</span>
                                </button>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
