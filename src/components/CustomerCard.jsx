// ─── CustomerCard.jsx ─────────────────────────────────────────────────────────
// Card in the stage grid. Shows name, CRN, capacity, location, POC, phone,
// branch, vendor, docs link, financial tag pill, internal remarks preview,
// money bar (Quoted / Received / Balance), and inline stage-move dropdown.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { Zap, MapPin, User, Building2, Package, FolderOpen, ChevronDown, Sun, Cpu } from 'lucide-react';
import { PRIMARY_STAGES, FINANCIAL_TAGS, FINANCIAL_TAG_COLORS } from '../constants';
import { formatIndianCurrency } from '../utils';

export default function CustomerCard({ customer, onSelect, onMoveStage, canSeeFinance = false }) {
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
        <div className="bg-white rounded-[22px] border border-stone-100 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-amber-400 group flex flex-col h-[400px] min-w-0">
            {/* Clickable top section */}
            <div className="px-6 py-5 cursor-pointer flex-1 min-h-0 overflow-hidden" onClick={() => onSelect(customer)}>
                <div className="flex justify-between items-start gap-3 h-12 mb-3">
                    <h3 title={customer.customer_name} className="min-w-0 line-clamp-2 break-words text-lg font-extrabold text-stone-800 group-hover:text-amber-600 transition-colors leading-6">
                        {customer.customer_name}
                    </h3>
                    <span className="text-xs bg-stone-100 text-stone-500 px-2.5 py-1 rounded-md font-bold uppercase max-w-[136px] shrink-0 truncate">
                        {customer.crn || 'NO-CRN'}
                    </span>
                </div>

                {/* Badges for Capacity and Project Type */}
                <div className="flex items-center gap-2 h-8 mb-3 overflow-hidden">
                    <span className="shrink-0 inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-sm font-bold border border-amber-100">
                        <Zap size={14} className="flex-shrink-0 text-amber-500" />
                        {customer.system_capacity_kwp ? `${customer.system_capacity_kwp} kWp` : '–'}
                    </span>
                    {customer.project_type && (
                        <span className="min-w-0 inline-flex items-center gap-1.5 bg-stone-50 text-stone-600 px-2.5 py-1 rounded-lg text-sm font-bold border border-stone-100 uppercase">
                            <span>📋</span>
                            <span className="truncate" title={customer.project_type}>{customer.project_type}</span>
                        </span>
                    )}
                </div>

                {/* Details side-by-side in a 2-column grid */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-stone-600 font-medium h-14 pt-2">
                    {(
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-stone-400 text-sm">📞</span>
                            <span className="truncate">{customer.phone_number || '–'}</span>
                        </div>
                    )}
                    {(
                        <div className="flex items-center gap-1.5 min-w-0">
                            <MapPin size={14} className="text-stone-400 flex-shrink-0" />
                            <span className="truncate">Area: <strong className="text-stone-800 font-bold">{customer.area || '–'}</strong></span>
                        </div>
                    )}
                    {(
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Sun size={14} className="text-amber-400 flex-shrink-0" />
                            <span className="truncate">Panel: <strong className="text-stone-700 font-semibold">{customer.panel || '–'}</strong></span>
                        </div>
                    )}
                    {(
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Cpu size={14} className="text-stone-400 flex-shrink-0" />
                            <span className="truncate">Inverter: <strong className="text-stone-700 font-semibold">{customer.inverter || '–'}</strong></span>
                        </div>
                    )}
                </div>

                {/* Vendor details */}
                {customer.vendor && (
                    <div className="flex items-center gap-2 text-sm text-stone-400 font-semibold mt-1 truncate">
                        <Package size={14} className="text-stone-300 flex-shrink-0" />
                        <span className="truncate">Vendor: <strong className="text-stone-500 font-semibold">{customer.vendor}</strong></span>
                    </div>
                )}
            </div>

            {/* Bottom strip — not clickable (stops propagation via parent) */}
            <div className="shrink-0 bg-gradient-to-b from-white to-stone-50/70 rounded-b-[22px]" onClick={e => e.stopPropagation()}>
                {/* Money bar */}
                <div className="h-16 grid grid-cols-3 gap-0 px-2 py-2.5">{canSeeFinance && <>
                    <div className="text-center px-2">
                        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">Quoted</p>
                        <p className="text-base font-bold text-stone-700 mt-0.5">{formatIndianCurrency(quotedAmt)}</p>
                    </div>
                    <div className="text-center px-2">
                        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">Received</p>
                        <p className="text-base font-bold text-emerald-600 mt-0.5">{formatIndianCurrency(totalPaid)}</p>
                    </div>
                    <div className="text-center px-2">
                        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wide">Balance</p>
                        <p className={`text-base font-bold mt-0.5 ${balance > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                            {formatIndianCurrency(balance)}
                        </p>
                    </div>
                </>}</div>

                {/* Financial tag pill */}
                <div className="h-8 px-6 flex items-center min-w-0">
                    {canSeeFinance && customer.financial_tag && (
                        <span title={customer.financial_tag} className={`max-w-full inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold uppercase border ${tagColors.bg || 'bg-stone-50'} ${tagColors.text || 'text-stone-500'} ${tagColors.border || 'border-stone-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tagColors.dot || 'bg-stone-400'}`} />
                            <span className="truncate">{customer.financial_tag}</span>
                        </span>
                    )}
                </div>

                {/* Internal remarks preview */}
                <div className="h-8 px-6 flex items-center min-w-0">
                    {customer.internal_remarks && (
                        <p title={customer.internal_remarks} className="text-xs text-stone-500 italic truncate">
                            💬 {customer.internal_remarks}
                        </p>
                    )}
                </div>

                {/* Stage move dropdown */}
                <div className="h-[60px] px-5 pt-1 pb-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1 min-w-0" ref={dropdownRef}>
                            <button onClick={() => setShowStageMenu(!showStageMenu)}
                                className="w-full flex items-center justify-between bg-white hover:bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 font-semibold transition-colors">
                                <span className="truncate">{PRIMARY_STAGES.find(s => s.id === customer.stage)?.label || customer.stage || 'Move to Stage'}</span>
                                <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-1 transition-transform ${showStageMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showStageMenu && (
                                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-xl border border-stone-100 py-1 z-20 max-h-64 overflow-y-auto">
                                    {PRIMARY_STAGES.map(stage => (
                                        <button key={stage.id}
                                            onClick={() => { onMoveStage(customer.id, stage.id); setShowStageMenu(false); }}
                                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-stone-50 transition-colors ${customer.stage === stage.id ? 'bg-amber-50 font-bold text-amber-700' : 'text-stone-600'}`}>
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
