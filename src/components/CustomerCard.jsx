// ─── CustomerCard.jsx ─────────────────────────────────────────────────────────
// Card in the stage grid. Shows name, CRN, capacity, location, POC, phone,
// branch, vendor, docs link, financial tag pill, internal remarks preview,
// money bar (Quoted / Received / Balance), and inline stage-move dropdown.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { Zap, MapPin, User, Building2, Package, FolderOpen, ChevronDown } from 'lucide-react';
import { PRIMARY_STAGES, FINANCIAL_TAGS, FINANCIAL_TAG_COLORS } from '../constants';

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
    const quotedAmt = Number(customer.quoted_amount || 0);
    const balance   = quotedAmt - totalPaid;
    const tagInfo   = FINANCIAL_TAGS.find(f => f.id === customer.financial_tag);
    const tagColors = customer.financial_tag ? (FINANCIAL_TAG_COLORS[customer.financial_tag] || {}) : {};

    return (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all border-l-4 border-l-amber-400 group flex flex-col">
            {/* Clickable top section */}
            <div className="p-5 cursor-pointer flex-1" onClick={() => onSelect(customer)}>
                <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-stone-800 group-hover:text-amber-600 transition-colors leading-tight">
                        {customer.customer_name}
                    </h3>
                    <span className="text-[9px] bg-stone-50 text-stone-400 px-2 py-1 rounded font-bold uppercase ml-2 whitespace-nowrap">
                        {customer.crn || 'NO-CRN'}
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                        <Zap size={11} className="text-amber-500 flex-shrink-0" />
                        <span>{customer.capacity_kwp ? `${customer.capacity_kwp} kWp` : '–'} {customer.project_type || ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                        <MapPin size={11} className="text-stone-300 flex-shrink-0" />
                        <span className="truncate">{customer.location || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                        <User size={11} className="text-stone-300 flex-shrink-0" />
                        <span className="truncate">{customer.poc || 'No POC'}</span>
                    </div>
                    {customer.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                            <span className="text-stone-300">📞</span>
                            <span>{customer.phone}</span>
                        </div>
                    )}
                    {customer.company_branch && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium col-span-2">
                            <Building2 size={11} className="text-stone-300 flex-shrink-0" />
                            <span>{customer.company_branch}</span>
                        </div>
                    )}
                    {customer.vendor && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium col-span-2">
                            <Package size={11} className="text-stone-300 flex-shrink-0" />
                            <span>Vendor: {customer.vendor}</span>
                        </div>
                    )}
                </div>
                {customer.google_docs && (
                    <div className="mb-3" onClick={e => e.stopPropagation()}>
                        <a href={customer.google_docs} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-full font-medium transition-colors">
                            <FolderOpen className="w-3 h-3" /> Docs
                        </a>
                    </div>
                )}
            </div>

            {/* Bottom strip — not clickable (stops propagation via parent) */}
            <div className="border-t border-stone-100 bg-stone-50/60 rounded-b-2xl" onClick={e => e.stopPropagation()}>
                {/* Money bar */}
                <div className="grid grid-cols-3 gap-0 divide-x divide-stone-100 px-1 py-3">
                    <div className="text-center px-2">
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wide">Quoted</p>
                        <p className="text-xs font-bold text-stone-700 mt-0.5">₹{(quotedAmt / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="text-center px-2">
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wide">Received</p>
                        <p className="text-xs font-bold text-emerald-600 mt-0.5">₹{(totalPaid / 1000).toFixed(0)}k</p>
                    </div>
                    <div className="text-center px-2">
                        <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wide">Balance</p>
                        <p className={`text-xs font-bold mt-0.5 ${balance > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                            ₹{(balance / 1000).toFixed(0)}k
                        </p>
                    </div>
                </div>

                {/* Financial tag pill */}
                {tagInfo && (
                    <div className="px-4 pb-3 border-t border-stone-100 pt-2">
                        <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${tagColors.bg || 'bg-stone-50'} ${tagColors.text || 'text-stone-500'} ${tagColors.border || 'border-stone-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tagColors.dot || 'bg-stone-400'}`} />
                            {tagInfo.label}
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
                    <div className="relative" ref={dropdownRef}>
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
                </div>
            </div>
        </div>
    );
}
