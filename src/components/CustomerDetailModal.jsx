// ─── CustomerDetailModal.jsx ──────────────────────────────────────────────────
// Full customer detail: 4-tab layout (Overview, Finance & Bank, Checklist,
// Notes & History). Section-level editing, sequential payments manager,
// subsidy status tags, centralized comments, and system activity timeline.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import {
    X, Edit3, Trash2, Save, Send, AlertTriangle, CheckSquare,
    User, Zap, IndianRupee,
    LayoutDashboard, History, Plus, ShieldCheck, Banknote, MessageSquare,
    CreditCard, CheckCircle2,
} from 'lucide-react';
import { PRIMARY_STAGES } from '../constants';
import { normalizeChecklist } from '../models';
import { logActivity, formatLogDate, formatDate } from '../utils';
import { supabase } from '../supabase';

const GENERAL_TAGS = ["Initial", "Installation", "Final payment"];
const PM_SURYA_TAGS = [
    "Registration payment 20k",
    "Installation payment",
    "Quotation amount",
    "Final payment after meter installation"
];

const DEFAULT_PAYMENT_METHODS = ["ONL", "CHQ", "DD", "CASH"];

function getFinancialTags(projectType) {
    if (!projectType) return GENERAL_TAGS;
    const normalized = projectType.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.includes('surya')) {
        return PM_SURYA_TAGS;
    }
    return GENERAL_TAGS;
}

// ─── formatMoney: Indian comma system (₹1,00,000) ────────────────────────────
function fmt(val) {
    const n = Number(val);
    if (!val || isNaN(n)) return '₹0';
    return '₹' + n.toLocaleString('en-IN');
}

const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const formatInputRupee = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const numString = String(val).replace(/[^0-9]/g, '');
    if (!numString) return '';
    const num = Number(numString);
    return num.toLocaleString('en-IN');
};

const parseInputRupee = (val) => {
    if (!val) return '';
    return val.replace(/,/g, '');
};

const getInitialPayments = (cust) => {
    if (Array.isArray(cust.payments) && cust.payments.length > 0) {
        return cust.payments;
    }
    const list = [];
    for (let k = 1; k <= 5; k++) {
        const amt = cust[`payment_${k}`];
        if (amt !== undefined && amt !== null && amt !== '') {
            list.push({
                no: k,
                amount: amt,
                remark: cust[`payment_remark_${k}`] || 'ONL',
                date: cust[`payment_date_${k}`] || cust.date || getTodayDateString()
            });
        }
    }
    return list;
};

// ─── MetaSelect: dropdown that lets the user type+add a new option ───────────
function MetaSelect({ label, field, value, onChange, category, options = [], isEditing }) {
    const [adding, setAdding] = useState(false);
    const [newVal, setNewVal] = useState('');
    const [localOptions, setLocalOptions] = useState(options);

    useEffect(() => { setLocalOptions(options); }, [options.length]);

    const handleAdd = async () => {
        const trimmed = newVal.trim();
        if (!trimmed) return;
        await supabase.from('metadata').insert({ category, label: trimmed });
        setLocalOptions(prev => [...prev, trimmed]);
        onChange(field, trimmed);
        setNewVal('');
        setAdding(false);
    };

    if (!isEditing) {
        return (
            <div className="bg-stone-50 py-1.5 px-3 rounded-xl">
                <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 font-bold">{label}</p>
                <p className="text-sm font-semibold truncate text-stone-800">{value || '–'}</p>
            </div>
        );
    }

    if (adding) {
        return (
            <div className="bg-stone-50 py-1.5 px-3 rounded-xl space-y-1">
                <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">{label} — New</p>
                <div className="flex gap-1">
                    <input autoFocus value={newVal} onChange={e => setNewVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder={`New ${label}...`}
                        className="flex-1 bg-white border border-amber-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300" />
                    <button onClick={handleAdd} className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-bold">Add</button>
                    <button onClick={() => setAdding(false)} className="px-3 py-1 bg-stone-200 text-stone-600 rounded-lg text-xs">✕</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-stone-50 py-1.5 px-3 rounded-xl">
            <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 font-bold">{label}</p>
            <div className="flex gap-1">
                <select value={value || ''} onChange={e => onChange(field, e.target.value)}
                    className="flex-1 bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300">
                    <option value="">Select...</option>
                    {localOptions.map(o => <option key={o}>{o}</option>)}
                </select>
                <button onClick={() => setAdding(true)} title="Add new option"
                    className="px-2 py-1 bg-stone-100 hover:bg-amber-50 hover:text-amber-600 text-stone-400 rounded-lg text-xs transition-colors flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ─── DetailItem / EditableDetailItem ──────────────────────────────────────────
function DetailItem({ label, value, isMoney = false, isEnergy = false, noTruncate = false, className = "", type = "text", options }) {
    let displayVal = value || '–';
    if (type === 'date' && value) {
        displayVal = formatDate(value);
    }
    if (options && Array.isArray(options)) {
        const found = options.find(o => typeof o === 'object' && o !== null && o.value === value);
        if (found) displayVal = found.label;
    }
    return (
        <div className={`bg-stone-50 py-2 px-3.5 rounded-xl ${className}`}>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 font-bold">{label}</p>
            <p className={`text-sm font-semibold ${noTruncate ? 'break-words whitespace-pre-wrap' : 'truncate'} ${isMoney ? 'text-emerald-600' : isEnergy ? 'text-amber-600' : 'text-stone-800'}`}>
                {isMoney ? fmt(value) : displayVal}
            </p>
        </div>
    );
}

function EditableDetailItem({ label, field, value, onChange, type = 'text', isMoney = false, isEnergy = false, isEditing, options, category, meta, noTruncate = false, className = "", disabled = false }) {
    if (options && category) {
        return (
            <div className={className}>
                <MetaSelect label={label} field={field} value={value} onChange={onChange} category={category} options={options} isEditing={isEditing} />
            </div>
        );
    }
    if (!isEditing) return <DetailItem label={label} value={value} isMoney={isMoney} isEnergy={isEnergy} noTruncate={noTruncate} className={className} type={type} options={options} />;
    return (
        <div className={`bg-stone-50 py-1.5 px-3 rounded-xl ${className}`}>
            <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 font-bold">{label}</p>
            {options ? (
                <select value={value || ''} onChange={e => onChange(field, e.target.value)} disabled={disabled}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-50">
                    <option value="">Select...</option>
                    {options.map(o => {
                        const isObj = typeof o === 'object' && o !== null;
                        const labelText = isObj ? o.label : o;
                        const valText = isObj ? o.value : o;
                        return <option key={valText} value={valText}>{labelText}</option>;
                    })}
                </select>
            ) : type === 'textarea' ? (
                <textarea value={value || ''} onChange={e => onChange(field, e.target.value)} rows={2} disabled={disabled}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 resize-none disabled:opacity-50" />
            ) : isMoney ? (
                <input type="text" placeholder="₹" value={formatInputRupee(value)} onChange={e => onChange(field, parseInputRupee(e.target.value))} disabled={disabled}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-50 font-semibold text-stone-800" />
            ) : (
                <input type={type} value={value || ''} onChange={e => onChange(field, e.target.value)} disabled={disabled}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-50" />
            )}
        </div>
    );
}

// ─── Standalone Sequential Payments Manager ──────────────────────────────────
function PaymentsManager({ payments = [], onSavePayments, saving = false, projectType = 'General', receivables = 0, totalReceived = 0, meta = {} }) {
    const maxPayments = String(projectType || '').toLowerCase().includes('surya') ? 5 : 3;
    const [addingMethod, setAddingMethod] = useState(false);
    const [newMethod, setNewMethod] = useState('');
    const [customMethods, setCustomMethods] = useState(meta['payment_method'] || []);

    // Active new payment input state
    const [nextPayment, setNextPayment] = useState({
        amount: '',
        remark: 'ONL',
        date: getTodayDateString()
    });

    // Currently editing index for previously saved payments
    const [editingIndex, setEditingIndex] = useState(null);
    const [editPaymentState, setEditPaymentState] = useState({ amount: '', remark: 'ONL', date: getTodayDateString() });

    useEffect(() => {
        if (meta['payment_method']) setCustomMethods(meta['payment_method']);
    }, [meta['payment_method']]);

    const allMethods = Array.from(new Set([
        ...DEFAULT_PAYMENT_METHODS,
        ...(customMethods.map(m => typeof m === 'object' ? m.label || m.value : m))
    ]));

    const handleAddNewMethod = async () => {
        const trimmed = newMethod.trim().toUpperCase();
        if (!trimmed) return;
        await supabase.from('metadata').insert({ category: 'payment_method', label: trimmed });
        setCustomMethods(prev => [...prev, trimmed]);
        setNewMethod('');
        setAddingMethod(false);
    };

    // Filter valid saved payments
    const savedPayments = payments.filter(p => p && p.amount !== '' && p.amount !== null && p.amount !== undefined);
    const backendTotalReceived = Number(totalReceived) || 0;
    const isFullyPaid = Number(receivables) === 0 && (backendTotalReceived > 0 || savedPayments.length > 0);

    // Save a new payment slot (e.g. Payment 1, Payment 2)
    const handleSaveNewPayment = async () => {
        if (!nextPayment.amount || Number(nextPayment.amount) <= 0) return;
        const newSlot = {
            no: savedPayments.length + 1,
            amount: nextPayment.amount,
            remark: nextPayment.remark || 'ONL',
            date: nextPayment.date || getTodayDateString()
        };
        const updatedList = [...savedPayments, newSlot];
        await onSavePayments(updatedList);
        // Reset new payment slot
        setNextPayment({
            amount: '',
            remark: 'ONL',
            date: getTodayDateString()
        });
    };

    // Delete a saved payment
    const handleRemoveSaved = async (idx) => {
        const updatedList = savedPayments.filter((_, i) => i !== idx).map((p, i) => ({ ...p, no: i + 1 }));
        await onSavePayments(updatedList);
        if (editingIndex === idx) setEditingIndex(null);
    };

    // Start editing an existing frozen payment
    const handleStartEdit = (idx) => {
        const target = savedPayments[idx];
        setEditingIndex(idx);
        setEditPaymentState({
            amount: target.amount,
            remark: target.remark || 'ONL',
            date: target.date || getTodayDateString()
        });
    };

    // Save edited existing payment
    const handleSaveEditedPayment = async (idx) => {
        const updatedList = savedPayments.map((p, i) => {
            if (i === idx) {
                return {
                    ...p,
                    amount: editPaymentState.amount,
                    remark: editPaymentState.remark,
                    date: editPaymentState.date
                };
            }
            return p;
        });
        await onSavePayments(updatedList);
        setEditingIndex(null);
    };

    const canShowNextSlot = !isFullyPaid && savedPayments.length < maxPayments;

    return (
        <div className="bg-white rounded-2xl p-5 border border-stone-200/70 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                        <CreditCard size={15} />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                            Payment Records ({String(projectType || '').toLowerCase().includes('surya') ? 'Max 5' : 'Max 3'})
                        </h4>
                        <p className="text-[10px] text-stone-400">
                            {isFullyPaid ? 'Account fully settled' : `Recorded ${savedPayments.length} of ${maxPayments} installments`}
                        </p>
                    </div>
                </div>
            </div>

            {/* List of Frozen / Saved Payments */}
            <div className="space-y-2.5">
                {savedPayments.map((p, i) => {
                    const isEditingThis = editingIndex === i;

                    if (isEditingThis) {
                        return (
                            <div key={i} className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md">
                                        Editing Payment {p.no || i + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setEditingIndex(null)}
                                        className="text-stone-400 hover:text-stone-600 text-xs font-semibold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[9px] text-stone-400 uppercase font-bold block mb-1">Amount (₹)</label>
                                        <input
                                            type="text"
                                            value={formatInputRupee(editPaymentState.amount)}
                                            onChange={e => setEditPaymentState(prev => ({ ...prev, amount: parseInputRupee(e.target.value) }))}
                                            className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-stone-400 uppercase font-bold block mb-1">Method</label>
                                        <select
                                            value={editPaymentState.remark || 'ONL'}
                                            onChange={e => setEditPaymentState(prev => ({ ...prev, remark: e.target.value }))}
                                            className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        >
                                            {allMethods.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-stone-400 uppercase font-bold block mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={editPaymentState.date || getTodayDateString()}
                                            onChange={e => setEditPaymentState(prev => ({ ...prev, date: e.target.value }))}
                                            className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => handleSaveEditedPayment(i)}
                                        disabled={saving}
                                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                    >
                                        <Save size={12} /> Save Update
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    // Frozen read-only view (no editable white inputs)
                    return (
                        <div key={i} className="flex items-center justify-between p-3 bg-stone-100/70 hover:bg-stone-100 rounded-xl border border-stone-200/60 transition-colors">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 bg-stone-200/80 px-2 py-0.5 rounded-md">
                                    Payment {p.no || i + 1}
                                </span>
                                <span className="text-sm font-extrabold text-stone-900">
                                    ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[11px] font-bold text-stone-600 bg-stone-200/60 px-2 py-0.5 rounded-md uppercase">
                                    {p.remark || 'ONL'}
                                </span>
                                <span className="text-xs text-stone-500 font-medium">
                                    {p.date ? formatDate(p.date) : '–'}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleStartEdit(i)}
                                    title="Edit payment"
                                    className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
                                >
                                    <Edit3 size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveSaved(i)}
                                    title="Delete payment"
                                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Active Next Payment Slot (Shows only if more payments allowed) */}
                {canShowNextSlot && (
                    <div className="bg-stone-50/90 rounded-xl p-4 border border-stone-200 space-y-3.5 mt-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-md">
                                Payment {savedPayments.length + 1}
                            </span>
                            <span className="text-[10px] text-stone-400 font-medium">Enter details and save to lock</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="text-[9px] text-stone-400 uppercase font-bold block mb-1">Amount (₹)</label>
                                <input
                                    type="text"
                                    placeholder="Enter amount..."
                                    value={formatInputRupee(nextPayment.amount)}
                                    onChange={e => setNextPayment(prev => ({ ...prev, amount: parseInputRupee(e.target.value) }))}
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[9px] text-stone-400 uppercase font-bold">Method</label>
                                    <button
                                        type="button"
                                        onClick={() => setAddingMethod(!addingMethod)}
                                        className="text-[9px] font-bold text-amber-600 hover:underline flex items-center gap-0.5"
                                    >
                                        <Plus size={10} /> Add
                                    </button>
                                </div>
                                {addingMethod ? (
                                    <div className="flex gap-1">
                                        <input
                                            type="text"
                                            placeholder="New method..."
                                            value={newMethod}
                                            onChange={e => setNewMethod(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddNewMethod()}
                                            className="flex-1 bg-white border border-amber-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddNewMethod}
                                            className="bg-amber-500 text-white px-2 py-1 rounded-lg text-xs font-bold"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAddingMethod(false)}
                                            className="bg-stone-200 text-stone-600 px-2 py-1 rounded-lg text-xs"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={nextPayment.remark || 'ONL'}
                                        onChange={e => setNextPayment(prev => ({ ...prev, remark: e.target.value }))}
                                        className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    >
                                        {allMethods.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[9px] text-stone-400 uppercase font-bold">Date</label>
                                    <button
                                        type="button"
                                        onClick={() => setNextPayment(prev => ({ ...prev, date: getTodayDateString() }))}
                                        className="text-[9px] font-bold text-amber-600 hover:underline"
                                    >
                                        Today
                                    </button>
                                </div>
                                <input
                                    type="date"
                                    value={nextPayment.date || getTodayDateString()}
                                    onChange={e => setNextPayment(prev => ({ ...prev, date: e.target.value || getTodayDateString() }))}
                                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                />
                            </div>
                        </div>

                        {/* Dedicated Save button for this payment */}
                        <button
                            type="button"
                            onClick={handleSaveNewPayment}
                            disabled={saving || !nextPayment.amount}
                            className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-40"
                        >
                            <Save size={13} /> {saving ? 'Saving...' : `Save Payment ${savedPayments.length + 1}`}
                        </button>
                    </div>
                )}
            </div>

            {/* Total Received Summary */}
            <div className="bg-emerald-50/70 rounded-xl p-3.5 flex justify-between items-center border border-emerald-100 mt-2">
                <div>
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Total Received (Auto-Sum)</p>
                    <p className="text-xs text-emerald-600">Calculated across {savedPayments.length} recorded installment{savedPayments.length !== 1 ? 's' : ''}</p>
                </div>
                <p className="text-base font-extrabold text-emerald-700">₹{backendTotalReceived.toLocaleString('en-IN')}</p>
            </div>
        </div>
    );
}

// ─── Subsidy Status Tags (Applied, Claimed, Returned, Received) ───────────────
const SUBSIDY_STATUS_OPTIONS = [
    {
        id: 'Applied',
        dateField: null,
        classes: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
        selected: 'bg-blue-100 border-blue-400 text-blue-800'
    },
    {
        id: 'Claimed',
        dateField: 'subsidy_claim',
        classes: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300',
        selected: 'bg-amber-100 border-amber-400 text-amber-800'
    },
    {
        id: 'Returned',
        dateField: null,
        classes: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300',
        selected: 'bg-rose-100 border-rose-400 text-rose-800'
    },
    {
        id: 'Received',
        dateField: 'subsidy_received',
        classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
        selected: 'bg-emerald-100 border-emerald-400 text-emerald-800'
    },
];

// ─── CustomerDetailModal ──────────────────────────────────────────────────────
export default function CustomerDetailModal({ customer, onClose, onUpdate, onDelete, user, meta = {} }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [editingSection, setEditingSection] = useState(null);
    const [editData, setEditData] = useState({ ...customer });
    const [followUpText, setFollowUpText] = useState('');
    const [commentText, setCommentText] = useState('');
    const [saving, setSaving] = useState(false);
    const [savingPayments, setSavingPayments] = useState(false);
    const [pendingSubsidyStatus, setPendingSubsidyStatus] = useState('');
    const [pendingSubsidyDate, setPendingSubsidyDate] = useState(getTodayDateString());
    const [pendingSubsidyRemark, setPendingSubsidyRemark] = useState('');
    const [savingSubsidy, setSavingSubsidy] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [activityLogs, setActivityLogs] = useState([]);
    const isAdmin = user?.userType === 'admin';

    const [localChecklist, setLocalChecklist] = useState(normalizeChecklist(customer.project_checklist));
    const [checklistDirty, setChecklistDirty] = useState(false);
    const [newItemLabel, setNewItemLabel] = useState('');
    const [editingRemarkId, setEditingRemarkId] = useState(null);
    const sections = [...new Set(localChecklist.map(item => item.section))];

    const ACTION_COLORS = {
        create: 'bg-emerald-100 text-emerald-700', update: 'bg-blue-100 text-blue-700',
        delete: 'bg-rose-100 text-rose-700', stage_change: 'bg-amber-100 text-amber-700',
        note: 'bg-indigo-100 text-indigo-700',
    };

    const fetchLogs = async () => {
        const { data } = await supabase.from('activity_log').select('*, profiles(name)')
            .or(`new_value.eq.${customer.id},message.ilike.%${customer.customer_name}%`)
            .order('created_at', { ascending: false }).limit(25);
        if (data) setActivityLogs(data);
    };

    useEffect(() => {
        const initialPayments = getInitialPayments(customer);
        setEditData({
            ...customer,
            payments: initialPayments
        });
        setLocalChecklist(normalizeChecklist(customer.project_checklist, customer));
        fetchLogs();
        setPendingSubsidyStatus('');
        setPendingSubsidyDate(getTodayDateString());
        setPendingSubsidyRemark('');
    }, [customer.id]);

    useEffect(() => {
        setLocalChecklist(normalizeChecklist(customer.project_checklist, customer));
        setEditData(prev => {
            const initialPayments = getInitialPayments(customer);
            return {
                ...prev,
                project_checklist: customer.project_checklist,
                payments: initialPayments,
                follow_ups: customer.follow_ups,
                subsidy_history: customer.subsidy_history,
                stage_remarks: customer.stage_remarks
            };
        });
    }, [customer.project_checklist, customer.payments, customer.follow_ups, customer.subsidy_history, customer.stage_remarks]);

    // ── Financial values are calculated by the Supabase backend trigger.
    // The modal only edits raw financial/payment fields.
    const handleChange = (field, val) => {
        setEditData(prev => ({
            ...prev,
            [field]: val
        }));
    };

    const handlePaymentsChange = (newPayments) => {
        setEditData(prev => ({
            ...prev,
            payments: newPayments
        }));
    };

    const handleSavePayments = async (customPayments) => {
        setSavingPayments(true);

        const paymentsToSave = customPayments || editData.payments || [];
        const updates = {
            payments: paymentsToSave
        };

        for (let k = 1; k <= 5; k++) {
            const p = (paymentsToSave || [])[k - 1];

            updates[`payment_${k}`] =
                p && p.amount !== '' && p.amount !== null && p.amount !== undefined
                    ? Number(p.amount)
                    : null;

            updates[`payment_remark_${k}`] =
                p ? (p.remark || null) : null;

            updates[`payment_date_${k}`] =
                p ? (p.date || null) : null;
        }

        await onUpdate(customer.id, updates);

        const receivedForLog = paymentsToSave.reduce(
            (sum, p) => sum + (Number(p?.amount) || 0),
            0
        );

        await logActivity(
            user.id,
            'update',
            `${customer.customer_name}: Payments updated (Total: ₹${receivedForLog.toLocaleString('en-IN')})`,
            customer.id
        );

        setEditData(prev => ({
            ...prev,
            ...updates,
            payments: paymentsToSave
        }));

        setSavingPayments(false);
        fetchLogs();
    };

    const handleSave = async () => {
        setSaving(true);
        const updates = { ...editData };

        for (let k = 1; k <= 5; k++) {
            const p = (updates.payments || [])[k - 1];
            updates[`payment_${k}`] = p ? (p.amount !== '' ? Number(p.amount) : null) : null;
            updates[`payment_remark_${k}`] = p ? (p.remark || null) : null;
            updates[`payment_date_${k}`] = p ? (p.date || null) : null;
        }

        let changeSummary = [];
        Object.keys(updates).forEach(key => {
            if (updates[key] !== customer[key] && key !== 'id' && key !== 'updated_at' && typeof updates[key] !== 'object') {
                changeSummary.push(`${key.replace(/_/g, ' ').toUpperCase()}: ${customer[key] || 'None'} → ${updates[key] || 'None'}`);
            }
        });
        delete updates.id; delete updates.created_at; delete updates.crn;
        await onUpdate(customer.id, updates);
        if (changeSummary.length > 0) await logActivity(user.id, 'update', changeSummary.join(' | '), customer.id);
        setEditingSection(null);
        setSaving(false);
        fetchLogs();
    };

    const handleAddNote = async () => {
        if (!followUpText.trim()) return;
        const updatedNotes = [...(editData.follow_ups || []), { text: followUpText, author: user.name, date: new Date().toISOString() }];
        await onUpdate(customer.id, { follow_ups: updatedNotes });
        await logActivity(user.id, 'note', `Note Added: ${followUpText}`, customer.id);
        setEditData(prev => ({ ...prev, follow_ups: updatedNotes }));
        setFollowUpText('');
        fetchLogs();
    };

    const handleAddComment = async () => {
        const text = commentText.trim();
        if (!text) return;
        const timestamp = new Date().toISOString();
        const line = `[${formatLogDate(timestamp)}] ${user.name} (${editData.stage || 'no stage'}): ${text}`;
        const updatedInternalRemarks = editData.internal_remarks ? `${editData.internal_remarks}\n${line}` : line;
        const updatedStageRemarks = [...(editData.stage_remarks || []), { text, author: user.name, date: timestamp, stage: editData.stage || null }];

        await onUpdate(customer.id, { internal_remarks: updatedInternalRemarks, stage_remarks: updatedStageRemarks });
        await logActivity(user.id, 'note', `Comment Added: ${text}`, customer.id);
        setEditData(prev => ({ ...prev, internal_remarks: updatedInternalRemarks, stage_remarks: updatedStageRemarks }));
        setCommentText('');
        fetchLogs();
    };

    const handleSubsidyStatusClick = (status) => {
        const opt = SUBSIDY_STATUS_OPTIONS.find(o => o.id === status);
        setPendingSubsidyStatus(status);

        const existingDate = opt?.dateField
            ? editData[opt.dateField]
            : null;

        setPendingSubsidyDate(existingDate || getTodayDateString());
        setPendingSubsidyRemark('');
    };

    const handleSaveSubsidy = async () => {
        if (!pendingSubsidyStatus || savingSubsidy) return;

        setSavingSubsidy(true);

        const opt = SUBSIDY_STATUS_OPTIONS.find(
            o => o.id === pendingSubsidyStatus
        );

        const timestamp = new Date().toISOString();

        const entry = {
            status: pendingSubsidyStatus,
            date: pendingSubsidyDate || getTodayDateString(),
            remark: pendingSubsidyRemark.trim(),
            author: user?.name || 'Unknown',
            created_at: timestamp
        };

        const updatedHistory = [
            ...(editData.subsidy_history || []),
            entry
        ];

        const patch = {
            subsidy_history: updatedHistory
        };

        if (opt?.dateField) {
            patch[opt.dateField] =
                pendingSubsidyDate || getTodayDateString();
        }

        await onUpdate(customer.id, patch);

        await logActivity(
            user.id,
            'update',
            `${customer.customer_name}: Subsidy ${pendingSubsidyStatus}`,
            customer.id
        );

        setEditData(prev => ({
            ...prev,
            ...patch
        }));

        setPendingSubsidyStatus('');
        setPendingSubsidyDate(getTodayDateString());
        setPendingSubsidyRemark('');
        setSavingSubsidy(false);
        fetchLogs();
    };

    const handleSoftDelete = async () => {
        const deletedAt = new Date().toISOString();
        await logActivity(user.id, 'delete', `Soft-deleted: ${customer.customer_name}`, customer.id);
        await onDelete(customer.id, deletedAt);
        onClose();
    };

    const SectionHeader = ({ title, id, icon: Icon, hideEdit = false }) => (
        <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-1.5 mt-6">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                <Icon size={13} /> {title}
            </h3>
            {!hideEdit && (
                <button
                    onClick={() => setEditingSection(editingSection === id ? null : id)}
                    className="text-stone-400 hover:text-amber-600 transition-colors p-1 rounded-lg hover:bg-amber-50"
                    title={editingSection === id ? "Cancel Editing" : "Edit Section"}
                >
                    {editingSection === id ? <X size={14} /> : <Edit3 size={13} />}
                </button>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-5xl h-[94vh] overflow-hidden flex flex-col border border-stone-100">

                {/* Header (Original clean format) */}
                <div className="bg-stone-900 px-6 py-4 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white">{customer.customer_name}</h2>
                        <span className="text-[10px] bg-white/10 text-stone-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{customer.crn || 'NO-CRN'}</span>
                    </div>
                    <div className="flex gap-2">
                        {isAdmin && <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-white/30 hover:text-red-400"><Trash2 size={18} /></button>}
                        <button onClick={onClose} className="p-2 text-white/30 hover:text-white"><X size={24} /></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-stone-900 px-6 gap-6 border-t border-white/5 flex-shrink-0">
                    {[
                        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                        { id: 'finance', label: 'Finance & Bank', icon: IndianRupee },
                        { id: 'subsidy', label: 'Subsidy', icon: Banknote },
                        { id: 'checklist', label: 'Checklist', icon: CheckSquare },
                        { id: 'history', label: 'Notes & History', icon: History },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setEditingSection(null); }}
                            className={`flex items-center gap-2 py-3 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab.id ? 'text-amber-400 border-amber-400' : 'text-stone-500 border-transparent hover:text-stone-300'}`}>
                            <tab.icon size={12} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-[#FCFBFA]">

                    {/* ── OVERVIEW ── */}
                    {activeTab === 'overview' && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            {/* Top bar: Stage control (left) + Comments (right) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch">
                                {/* Stage select */}
                                <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm flex flex-col justify-between">
                                    <label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">Primary Stage</label>
                                    <div className="flex gap-2">
                                        <select value={editData.stage} onChange={async (e) => {
                                            const newStage = e.target.value;
                                            const oldStage = editData.stage;
                                            setEditData(prev => ({ ...prev, stage: newStage }));
                                            await onUpdate(customer.id, { stage: newStage });
                                            await logActivity(user.id, 'stage_change', `STAGE: ${oldStage} → ${newStage}`, customer.id);
                                            fetchLogs();
                                        }} className="flex-1 p-2 bg-white border border-stone-200 rounded-lg font-semibold text-xs text-stone-700 outline-none">
                                            {PRIMARY_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                        </select>
                                        {(() => {
                                            const currentIndex = PRIMARY_STAGES.findIndex(s => s.id === editData.stage);
                                            const nextStage = currentIndex !== -1 && currentIndex < PRIMARY_STAGES.length - 1 ? PRIMARY_STAGES[currentIndex + 1] : null;
                                            return (
                                                <button
                                                    type="button"
                                                    disabled={!nextStage}
                                                    onClick={async () => {
                                                        if (nextStage) {
                                                            const oldStage = editData.stage;
                                                            setEditData(prev => ({ ...prev, stage: nextStage.id }));
                                                            await onUpdate(customer.id, { stage: nextStage.id });
                                                            await logActivity(user.id, 'stage_change', `STAGE: ${oldStage} → ${nextStage.id}`, customer.id);
                                                            fetchLogs();
                                                        }
                                                    }}
                                                    title={nextStage ? `Move to next stage: ${nextStage.label}` : 'Already at the final stage'}
                                                    className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-30 disabled:hover:bg-stone-900 flex items-center justify-center flex-shrink-0 transition-all font-bold text-xs"
                                                >
                                                    <span className="leading-none">→</span>
                                                </button>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Centralized comment box */}
                                <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm flex flex-col justify-between">
                                    <label className="text-[10px] text-stone-400 font-bold uppercase mb-1 flex items-center gap-1">
                                        <MessageSquare size={11} /> Add Comment
                                    </label>
                                    <div className="flex gap-2">
                                        <input value={commentText} onChange={e => setCommentText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                            placeholder="Note for this customer..."
                                            className="flex-1 p-2 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 outline-none focus:ring-1 focus:ring-amber-300" />
                                        <button type="button" onClick={handleAddComment} disabled={!commentText.trim()}
                                            className="px-3 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-30 disabled:hover:bg-stone-900 flex items-center justify-center flex-shrink-0 transition-all">
                                            <Save size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info */}
                            <section className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                <SectionHeader title="Customer Info" id="cus" icon={User} />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                                    <EditableDetailItem label="Customer Name" field="customer_name" value={editData.customer_name} onChange={handleChange} isEditing={editingSection === 'cus'} />
                                    <EditableDetailItem label="Phone Number" field="phone_number" value={editData.phone_number} onChange={handleChange} isEditing={editingSection === 'cus'} />
                                    <EditableDetailItem label="AREA" field="area" value={editData.area} onChange={handleChange} isEditing={editingSection === 'cus'} />
                                    <EditableDetailItem label="Full Installation Address" field="full_installation_address" value={editData.full_installation_address} onChange={handleChange} isEditing={editingSection === 'cus'} noTruncate type="textarea" className="col-span-2 md:col-span-3" />
                                </div>
                            </section>

                            {/* Project & Technical */}
                            <section className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                <SectionHeader title="Project & Technical" id="pro" icon={Zap} />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                    <EditableDetailItem label="System Capacity (kWp)" field="system_capacity_kwp" value={editData.system_capacity_kwp} onChange={handleChange} type="number" isEnergy isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="PO No" field="po_no" value={editData.po_no} onChange={handleChange} isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="APPLICATION NO" field="application_no" value={editData.application_no} onChange={handleChange} isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="Consumer Number" field="consumer_number" value={editData.consumer_number} onChange={handleChange} isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="PANEL" field="panel" value={editData.panel} onChange={handleChange} options={meta['panel']} category="panel" isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="INVERTER" field="inverter" value={editData.inverter} onChange={handleChange} options={meta['inverter']} category="inverter" isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="DATE OF REGISTRATION" field="date_of_registration" value={editData.date_of_registration} onChange={handleChange} type="date" isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="METER PHASE" field="meter_phase" value={editData.meter_phase} onChange={handleChange} options={meta['meter_phase']} category="meter_phase" isEditing={editingSection === 'pro'} />
                                </div>
                            </section>
                        </div>
                    )}

                    {/* ── FINANCE & BANK ── */}
                    {activeTab === 'finance' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 items-stretch">
                                {/* Project Type */}
                                <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm">
                                    <label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">Project Type</label>
                                    <select value={editData.project_type || 'General'} onChange={async (e) => {
                                        const newType = e.target.value;
                                        setEditData(prev => ({ ...prev, project_type: newType }));
                                        await onUpdate(customer.id, { project_type: newType });
                                        await logActivity(user.id, 'update', `${customer.customer_name}: Project Type changed to ${newType}`, customer.id);
                                        fetchLogs();
                                    }} className="w-full p-2 bg-white border border-stone-200 rounded-lg font-semibold text-xs text-stone-700 outline-none">
                                        <option value="General">General</option>
                                        <option value="PM SURYA">PM SURYA</option>
                                    </select>
                                </div>

                                {/* Financial Tag */}
                                <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm">
                                    <label className="text-[10px] text-stone-400 font-bold uppercase mb-1 block">Financial Tag</label>
                                    <select value={editData.financial_tag || ''} onChange={async (e) => {
                                        const newTag = e.target.value;
                                        setEditData(prev => ({ ...prev, financial_tag: newTag }));
                                        await onUpdate(customer.id, { financial_tag: newTag });
                                        await logActivity(user.id, 'update', `${customer.customer_name}: Financial Tag updated to ${newTag}`, customer.id);
                                        fetchLogs();
                                    }} className="w-full p-2 bg-white border border-stone-200 rounded-lg font-semibold text-xs text-stone-700 outline-none">
                                        <option value="">Select Tag...</option>
                                        {getFinancialTags(editData.project_type).map(tag => (
                                            <option key={tag} value={tag}>{tag}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <section className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                <SectionHeader title="Financial Summary" id="fin" icon={IndianRupee} />

                                {/* Row 1: Quoted (editable), Received (Read-Only), Receivable (Read-Only) */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                                    <EditableDetailItem
                                        label="Quoted Amt"
                                        field="quoted_amount_3"
                                        value={editData.quoted_amount_3}
                                        onChange={handleChange}
                                        type="number"
                                        isEditing={editingSection === 'fin'}
                                        isMoney
                                    />
                                    <div className="bg-stone-50 py-1.5 px-3 rounded-xl border border-stone-100/80">
                                        <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 font-bold">Received (Auto)</p>
                                        <p className="text-sm font-semibold text-emerald-600">
                                            {fmt(editData.total_received)}
                                        </p>
                                    </div>
                                    <div className={`py-1.5 px-3 rounded-xl border ${Number(editData.receivables) === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-stone-50 border-stone-100/80 text-stone-800'}`}>
                                        <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 font-bold">Receivable (Auto)</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">
                                                {fmt(editData.receivables)}
                                            </p>
                                            {Number(editData.receivables) === 0 && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                                                    <CheckCircle2 size={10} /> Fully Paid
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-2.5 border-t border-stone-100">
                                    <EditableDetailItem label="Date" field="date" value={editData.date} onChange={handleChange} type="date" isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Bill No" field="bill_no" value={editData.bill_no} onChange={handleChange} isEditing={editingSection === 'fin'} />
                                    <div className="bg-stone-50 py-1.5 px-3 rounded-xl border border-stone-100/80">
                                        <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 font-bold">
                                            Payment Receipt Date (Auto)
                                        </p>
                                        <p className="text-sm font-semibold text-stone-800">
                                            {editData.payment_reciept ? formatDate(editData.payment_reciept) : '–'}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Standalone Sequential Payments Section */}
                            <PaymentsManager
                                payments={editData.payments || []}
                                onUpdatePayments={handlePaymentsChange}
                                onSavePayments={handleSavePayments}
                                saving={savingPayments}
                                projectType={editData.project_type}
                                receivables={editData.receivables}
                                totalReceived={editData.total_received}
                                meta={meta}
                            />

                        </div>
                    )}

                    {/* ── SUBSIDY ── */}
                    {activeTab === 'subsidy' && (
                        <div className="space-y-4 animate-in fade-in duration-300">

                            <section className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-3 border-b border-stone-100 pb-2">
                                    <Banknote size={13} className="text-stone-400" />
                                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                                        Subsidy Status
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {SUBSIDY_STATUS_OPTIONS.map(opt => {
                                        const isSelected = pendingSubsidyStatus === opt.id;

                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => handleSubsidyStatusClick(opt.id)}
                                                className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all text-center ${
                                                    isSelected
                                                        ? opt.selected
                                                        : opt.classes
                                                }`}
                                            >
                                                {opt.id}
                                            </button>
                                        );
                                    })}
                                </div>

                                {pendingSubsidyStatus && (
                                    <div className="mt-3 pt-3 border-t border-stone-100 space-y-2.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div className="bg-stone-50 py-2 px-3 rounded-xl border border-stone-100">
                                                <label className="text-[10px] text-stone-400 uppercase tracking-wider mb-1 block font-bold">
                                                    Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={pendingSubsidyDate}
                                                    onChange={e => setPendingSubsidyDate(e.target.value)}
                                                    className="w-full bg-transparent text-xs font-semibold text-stone-800 outline-none"
                                                />
                                            </div>

                                            <div className="bg-stone-50 py-2 px-3 rounded-xl border border-stone-100">
                                                <label className="text-[10px] text-stone-400 uppercase tracking-wider mb-1 block font-bold">
                                                    Remark (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={pendingSubsidyRemark}
                                                    onChange={e => setPendingSubsidyRemark(e.target.value)}
                                                    placeholder="Add a remark..."
                                                    className="w-full bg-transparent text-xs font-semibold text-stone-800 outline-none placeholder:text-stone-300"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleSaveSubsidy}
                                            disabled={savingSubsidy}
                                            className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Save size={13} />
                                            {savingSubsidy
                                                ? 'Saving Subsidy Status...'
                                                : `Save ${pendingSubsidyStatus} Status`
                                            }
                                        </button>

                                        <p className="text-[10px] text-stone-400 text-center">
                                            Changes are only added to subsidy history after saving.
                                        </p>
                                    </div>
                                )}
                            </section>

                            <section className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
                                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                                        Current Dates
                                    </h3>
                                    <span className="text-[10px] text-stone-400">
                                        Saved values
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="bg-stone-50 py-2 px-3 rounded-xl border border-stone-100">
                                        <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 font-bold">
                                            Subsidy Claim
                                        </p>
                                        <p className="text-sm font-semibold text-stone-800">
                                            {editData.subsidy_claim
                                                ? formatDate(editData.subsidy_claim)
                                                : '–'
                                            }
                                        </p>
                                    </div>

                                    <div className="bg-stone-50 py-2 px-3 rounded-xl border border-stone-100">
                                        <p className="text-[10px] text-stone-400 uppercase tracking-wider mb-0.5 font-bold">
                                            Subsidy Received
                                        </p>
                                        <p className="text-sm font-semibold text-stone-800">
                                            {editData.subsidy_received
                                                ? formatDate(editData.subsidy_received)
                                                : '–'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 border-b border-stone-100 pb-2">
                                    Subsidy History
                                </h3>

                                {(editData.subsidy_history || []).length === 0 ? (
                                    <p className="text-xs text-stone-400 italic">
                                        No subsidy history recorded
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {(editData.subsidy_history || [])
                                            .slice()
                                            .reverse()
                                            .map((h, i) => {
                                                const remark = h.remark || h.note || '';

                                                return (
                                                    <details
                                                        key={`${h.date || 'date'}-${h.status || 'status'}-${i}`}
                                                        className="bg-stone-50 rounded-xl border border-stone-100 overflow-hidden"
                                                    >
                                                        <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="font-bold text-xs text-stone-700">
                                                                    {h.status || 'Status'}
                                                                </span>

                                                                {remark && (
                                                                    <span className="text-[10px] text-stone-400 truncate">
                                                                        · {remark}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <span className="text-[10px] text-stone-400 flex-shrink-0">
                                                                {h.date ? formatDate(h.date) : '–'}
                                                            </span>
                                                        </summary>

                                                        <div className="px-3 pb-3 pt-2 border-t border-stone-100 space-y-2">
                                                            <div>
                                                                <p className="text-[9px] text-stone-400 uppercase font-bold tracking-wider">
                                                                    Date
                                                                </p>
                                                                <p className="text-xs font-semibold text-stone-700 mt-0.5">
                                                                    {h.date ? formatDate(h.date) : '–'}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[9px] text-stone-400 uppercase font-bold tracking-wider">
                                                                    By
                                                                </p>
                                                                <p className="text-xs font-semibold text-stone-700 mt-0.5">
                                                                    {h.author || 'Unknown'}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[9px] text-stone-400 uppercase font-bold tracking-wider">
                                                                    Remark
                                                                </p>
                                                                {remark ? (
                                                                    <p className="text-xs text-stone-700 mt-0.5 whitespace-pre-wrap break-words">
                                                                        {remark}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-xs text-stone-400 italic mt-0.5">
                                                                        No remark added
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </details>
                                                );
                                            })}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {/* ── CHECKLIST ── */}
                    {activeTab === 'checklist' && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            {checklistDirty && (
                                <div className="flex items-center justify-between bg-amber-50/60 p-3 px-4 rounded-xl border border-amber-100 mb-3">
                                    <span className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                        Unsaved changes in checklist
                                    </span>
                                    <button onClick={async () => {
                                        const updates = { project_checklist: localChecklist };
                                        localChecklist.forEach(item => {
                                            if (['file_ready_to_customer', 'file_given_to_customer', 'meter_file_submission', 'meter_instaled', 'panel_and_inverter', 'fabrication_and_wiring'].includes(item.id)) {
                                                updates[item.id] = item.checked;
                                            }
                                            if (item.id === 'panel_and_inverter') {
                                                updates.panel_and_inverter_remarks = item.remark || '';
                                            }
                                            if (item.id === 'fabrication_and_wiring') {
                                                updates.fabrication_and_wiring_remarks = item.remark || '';
                                            }
                                        });
                                        await onUpdate(customer.id, updates);
                                        setChecklistDirty(false);
                                        fetchLogs();
                                    }}
                                        className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-amber-700 transition-colors">Save Checklist</button>
                                </div>
                            )}

                            {/* Add Custom Item Section */}
                            <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm mb-3">
                                <h4 className="text-[10px] font-bold text-stone-400 mb-2.5 uppercase tracking-widest border-b border-stone-50 pb-1.5">Add Custom Checklist Item</h4>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="e.g. Verify solar net meter application..." value={newItemLabel}
                                        onChange={e => setNewItemLabel(e.target.value)}
                                        className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-400" />
                                    <button onClick={() => {
                                        const label = newItemLabel.trim();
                                        if (!label) return;
                                        const newItem = {
                                            id: `custom_${Date.now()}`,
                                            label,
                                            section: 'Project Checklist',
                                            checked: false,
                                            remark: '',
                                        };
                                        setLocalChecklist([...localChecklist, newItem]);
                                        setNewItemLabel('');
                                        setChecklistDirty(true);
                                    }} className="bg-stone-900 text-white px-4 rounded-lg text-xs font-bold hover:bg-stone-800 transition-all flex items-center gap-1.5">
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {sections.map(sec => (
                                    <div key={sec} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                        <h4 className="text-[10px] font-bold text-stone-400 mb-3 uppercase tracking-widest border-b border-stone-50 pb-1.5">{sec}</h4>
                                        <div className="flex flex-col gap-2">
                                            {localChecklist.filter(i => i.section === sec).map(item => (
                                                <div key={item.id} className="py-1.5 px-3 bg-stone-50/50 rounded-xl border border-stone-100 hover:border-stone-200 transition-all flex items-center justify-between gap-3">
                                                    <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                                                        <input type="checkbox" checked={item.checked} onChange={() => {
                                                            const updated = localChecklist.map(i => i.id === item.id ? { ...i, checked: !i.checked, checkedAt: new Date().toISOString(), checkedBy: user.name } : i);
                                                            setLocalChecklist(updated); setChecklistDirty(true);
                                                        }} className="mt-0.5 rounded border-stone-300 text-amber-500 focus:ring-amber-500 cursor-pointer" />
                                                        <div className="flex-1 min-w-0">
                                                            <span className={`text-xs block font-semibold ${item.checked ? 'text-stone-400 line-through font-normal' : 'text-stone-700'}`}>{item.label}</span>
                                                            {item.checked && <span className="text-[10px] text-stone-400 font-bold uppercase mt-0.5 block">By {item.checkedBy} on {formatLogDate(item.checkedAt)}</span>}
                                                        </div>
                                                    </label>

                                                    <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
                                                        {(item.id === 'panel_and_inverter' || item.id === 'fabrication_and_wiring') ? (
                                                            editingRemarkId === item.id ? (
                                                                <div className="flex gap-1.5 items-center">
                                                                    <input type="text" placeholder="Remark..." defaultValue={item.remark || ''}
                                                                        id={`remark_input_${item.id}`}
                                                                        className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-amber-300 w-32 sm:w-40" />
                                                                    <button onClick={() => {
                                                                        const val = document.getElementById(`remark_input_${item.id}`).value.trim();
                                                                        const updated = localChecklist.map(i => i.id === item.id ? { ...i, remark: val } : i);
                                                                        setLocalChecklist(updated);
                                                                        setChecklistDirty(true);
                                                                        setEditingRemarkId(null);
                                                                    }} className="bg-stone-900 text-white px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-stone-800 transition-colors">Done</button>
                                                                    <button onClick={() => setEditingRemarkId(null)} className="text-stone-400 hover:text-stone-600 text-[10px] font-medium">Cancel</button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    {item.remark ? (
                                                                        <div className="flex items-center gap-1.5 bg-amber-50/50 text-stone-600 px-2 py-1 rounded-lg border border-amber-100">
                                                                            <span className="font-medium italic">Remark: {item.remark}</span>
                                                                            <button onClick={() => setEditingRemarkId(item.id)} className="text-amber-600 hover:text-amber-700 font-bold transition-colors">Edit</button>
                                                                        </div>
                                                                    ) : (
                                                                        <button onClick={() => setEditingRemarkId(item.id)} className="text-stone-400 hover:text-stone-600 font-semibold transition-colors flex items-center gap-1 border border-stone-200 hover:bg-stone-50 px-2 py-1 rounded-lg">
                                                                            <span>+ Add Remark</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )
                                                        ) : null}
                                                        {item.id.startsWith('custom_') && (
                                                            <button onClick={() => {
                                                                const updated = localChecklist.filter(i => i.id !== item.id);
                                                                setLocalChecklist(updated); setChecklistDirty(true);
                                                            }} className="text-stone-300 hover:text-red-500 transition-colors p-1" title="Delete custom item">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── NOTES & HISTORY ── */}
                    {activeTab === 'history' && (
                        <div className="space-y-8 animate-in fade-in duration-300">
                            <section>
                                <SectionHeader title="Internal Remarks (Staff Only)" id="rem" icon={ShieldCheck} />
                                {editingSection === 'rem' ? (
                                    <textarea value={editData.internal_remarks || ''} onChange={e => handleChange('internal_remarks', e.target.value)}
                                        className="w-full p-4 border rounded-2xl text-sm bg-stone-50 focus:ring-1 focus:ring-amber-400 outline-none" rows={4}
                                        placeholder="Sensitive notes visible only to internal staff..." />
                                ) : (
                                    <div className="bg-stone-100/50 p-4 rounded-2xl border border-stone-200 text-sm text-stone-600 italic whitespace-pre-wrap">
                                        {editData.internal_remarks || 'No internal remarks recorded yet.'}
                                    </div>
                                )}
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Activity Notes</h3>
                                <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
                                    {(editData.follow_ups || []).slice().reverse().map((f, i) => (
                                        <div key={i} className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                            <p className="text-xs text-stone-800 leading-relaxed">{f.text}</p>
                                            <div className="flex justify-between mt-2.5 text-[10px] text-stone-400 font-bold uppercase">
                                                <span>{f.author}</span><span>{formatLogDate(f.date)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input value={followUpText} onChange={e => setFollowUpText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                                        placeholder="Share an update with the team..."
                                        className="flex-1 px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-amber-400" />
                                    <button onClick={handleAddNote} className="bg-stone-900 text-white px-6 rounded-xl hover:bg-stone-800 transition-all flex items-center justify-center">
                                        <Send size={16} />
                                    </button>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Detailed System History</h3>
                                <div className="space-y-4">
                                    {activityLogs.length > 0 ? activityLogs.map((log, i) => (
                                        <div key={i} className="relative pl-6 pb-4 border-l border-stone-100 last:border-0">
                                            <div className="absolute -left-[4.5px] top-0 w-2 h-2 rounded-full bg-white border-2 border-amber-500 shadow-sm" />
                                            <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm -mt-1.5 hover:border-amber-200 transition-colors">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${ACTION_COLORS[log.action] || 'bg-stone-100 text-stone-600'}`}>{log.action}</span>
                                                    <span className="text-[10px] text-stone-400 font-bold">{formatLogDate(log.created_at)}</span>
                                                </div>
                                                <div className="text-xs text-stone-700 font-medium whitespace-pre-wrap leading-relaxed">
                                                    {log.message.includes('|') ? (
                                                        <div className="space-y-1">
                                                            {log.message.split('|').map((line, idx) => (
                                                                <div key={idx} className="flex items-center gap-1"><span className="text-stone-400">↳</span> {line.trim()}</div>
                                                            ))}
                                                        </div>
                                                    ) : log.message}
                                                </div>
                                                <p className="text-[10px] text-stone-400 font-bold uppercase mt-2 border-t border-stone-50 pt-1.5">User: {log.profiles?.name || 'System'}</p>
                                            </div>
                                        </div>
                                    )) : <p className="text-xs text-stone-400 italic">No timeline entries found.</p>}
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                {/* Save bar */}
                {editingSection && (
                    <div className="p-4 border-t border-stone-100 bg-white flex-shrink-0">
                        <button onClick={handleSave} disabled={saving}
                            className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all">
                            {saving ? 'Saving Changes...' : <><Save size={16} /> Save Changes</>}
                        </button>
                    </div>
                )}
            </div>

            {/* Soft-delete confirm */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                            <h3 className="font-bold text-stone-800">Move to Trash?</h3>
                        </div>
                        <p className="text-sm text-stone-600 mb-5">
                            <strong>{customer.customer_name}</strong> will be moved to Trash. You can recover it later from the Trash view.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 border border-stone-300 text-stone-700 rounded-xl text-sm font-medium">Cancel</button>
                            <button onClick={handleSoftDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                                <Trash2 className="w-4 h-4" /> Move to Trash
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}