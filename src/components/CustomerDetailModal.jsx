// ─── CustomerDetailModal.jsx ──────────────────────────────────────────────────
// Full customer detail: 4-tab layout (Overview, Finance & Bank, Checklist,
// Notes & History). Section-level editing, payments array editor, generic
// history entry editor, financial tag toggle, and system activity timeline.
//
// CLIENT CUSTOMISATION:
//   • Sections and fields: edit the <section> blocks in the Overview/Finance tabs
//   • Checklist template: edit DEFAULT_PROJECT_CHECKLIST in models.jsx
//   • Stage/tag options: edit constants.js
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import {
    X, Edit3, Trash2, Save, Send, AlertTriangle, CheckSquare,
    User, Zap, IndianRupee, Building2, FolderOpen, MapPin,
    LayoutDashboard, History, Plus, ShieldCheck, Banknote,
} from 'lucide-react';
import { PRIMARY_STAGES, FINANCIAL_TAGS, FINANCIAL_TAG_COLORS } from '../constants';
import { normalizeChecklist } from '../models';
import { logActivity, formatLogDate, formatDate } from '../utils';
import { supabase } from '../supabase';
import HistoryEntryEditor from './HistoryEntryEditor';

const GENERAL_TAGS = ["Initial", "Installation", "Final payment"];
const PM_SURYA_TAGS = ["Registration payment 20k", "Installation payment", "Quotation amount", "Final payment after meter installation"];

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
    if (!val || isNaN(n)) return '–';
    return '₹' + n.toLocaleString('en-IN');
}

// ─── MetaSelect: dropdown that lets the user type+add a new option ───────────
// Adds the new value to the Supabase metadata table automatically.
function MetaSelect({ label, field, value, onChange, category, options = [], isEditing }) {
    const [adding, setAdding] = useState(false);
    const [newVal, setNewVal] = useState('');
    const [localOptions, setLocalOptions] = useState(options);

    useEffect(() => { setLocalOptions(options); }, [options.length]);

    const handleAdd = async () => {
        const trimmed = newVal.trim();
        if (!trimmed) return;
        // Persist to Supabase metadata table
        await supabase.from('metadata').insert({ category, label: trimmed });
        setLocalOptions(prev => [...prev, trimmed]);
        onChange(field, trimmed);
        setNewVal('');
        setAdding(false);
    };

    if (!isEditing) {
        return (
            <div className="bg-stone-50 py-1.5 px-3 rounded-xl">
                <p className="text-[9px] text-stone-400 uppercase tracking-wide mb-0.5 font-bold">{label}</p>
                <p className="text-sm font-semibold truncate text-stone-800">{value || '–'}</p>
            </div>
        );
    }

    if (adding) {
        return (
            <div className="bg-stone-50 py-1.5 px-3 rounded-xl space-y-1.5">
                <p className="text-[9px] text-stone-400 uppercase tracking-wide font-bold">{label} — New</p>
                <div className="flex gap-1">
                    <input autoFocus value={newVal} onChange={e => setNewVal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        placeholder={`New ${label}...`}
                        className="flex-1 bg-white border border-amber-300 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300" />
                    <button onClick={handleAdd} className="px-2 py-0.5 bg-amber-500 text-white rounded-lg text-xs font-bold">Add</button>
                    <button onClick={() => setAdding(false)} className="px-2 py-0.5 bg-stone-200 text-stone-600 rounded-lg text-xs">✕</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-stone-50 py-1.5 px-3 rounded-xl">
            <p className="text-[9px] text-stone-400 uppercase tracking-wide mb-0.5 font-bold">{label}</p>
            <div className="flex gap-1">
                <select value={value || ''} onChange={e => onChange(field, e.target.value)}
                    className="flex-1 bg-white border border-stone-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300">
                    <option value="">Select...</option>
                    {localOptions.map(o => <option key={o}>{o}</option>)}
                </select>
                <button onClick={() => setAdding(true)} title="Add new option"
                    className="px-1.5 py-0.5 bg-stone-100 hover:bg-amber-50 hover:text-amber-600 text-stone-400 rounded-lg text-xs transition-colors">
                    <Plus className="w-3 h-3" />
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
        <div className={`bg-stone-50 py-1.5 px-3 rounded-xl ${className}`}>
            <p className="text-[9px] text-stone-400 uppercase tracking-wide mb-0.5 font-bold">{label}</p>
            <p className={`text-sm font-semibold ${noTruncate ? 'break-words whitespace-pre-wrap' : 'truncate'} ${isMoney ? 'text-emerald-600' : isEnergy ? 'text-amber-600' : 'text-stone-800'}`}>
                {isMoney ? fmt(value) : displayVal}
            </p>
        </div>
    );
}

function EditableDetailItem({ label, field, value, onChange, type = 'text', isMoney = false, isEnergy = false, isEditing, options, category, meta, noTruncate = false, className = "", disabled = false }) {
    // Metadata-driven dropdown with add-new
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
            <p className="text-[9px] text-stone-400 uppercase tracking-wide mb-0.5 font-bold">{label}</p>
            {options ? (
                <select value={value || ''} onChange={e => onChange(field, e.target.value)} disabled={disabled}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-50">
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
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300 resize-none disabled:opacity-50" />
            ) : (
                <input type={type} value={value || ''} onChange={e => onChange(field, e.target.value)} disabled={disabled}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-50" />
            )}
        </div>
    );
}

// ─── PaymentsEditor ───────────────────────────────────────────────────────────
// onChange(newPayments, totalReceived) — passes total up so parent can save it
function PaymentsEditor({ payments = [], onChange, isEditing }) {
    const handleChange = (idx, field, val) => {
        const next = payments.map((p, i) => i === idx ? { ...p, [field]: val } : p);
        const total = next.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        onChange(next, total);
    };
    const addPayment = () => {
        const next = [...payments, { no: payments.length + 1, amount: '', date: '' }];
        const total = next.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        onChange(next, total);
    };
    const removePayment = (idx) => {
        const next = payments.filter((_, i) => i !== idx);
        const total = next.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        onChange(next, total);
    };

    const displayTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    if (!isEditing) return (
        <div className="space-y-2">
            {payments.length === 0 && <p className="text-xs text-stone-400 italic">No payments recorded</p>}
            {payments.map((p, i) => (
                <div key={i} className="bg-stone-50 p-3 rounded-xl flex justify-between items-center">
                    <div>
                        <p className="text-[9px] text-stone-400 font-bold uppercase">Payment {p.no || i + 1}</p>
                        <p className="text-sm font-semibold text-emerald-600">₹{Number(p.amount || 0).toLocaleString('en-IN')}</p>
                    </div>
                    {p.date && <p className="text-xs text-stone-400">{p.date}</p>}
                </div>
            ))}
            {payments.length > 0 && (
                <div className="bg-emerald-50 rounded-xl p-3 flex justify-between items-center border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Total Received</p>
                    <p className="text-sm font-bold text-emerald-700">₹{displayTotal.toLocaleString('en-IN')}</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-2">
            {payments.map((p, i) => (
                <div key={i} className="bg-stone-50 p-3 rounded-xl space-y-2 border border-stone-200">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold text-stone-400 uppercase">Payment {p.no || i + 1}</p>
                        <button onClick={() => removePayment(i)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Amount (₹)" value={p.amount || ''}
                            onChange={e => handleChange(i, 'amount', e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300" />
                        <input type="date" value={p.date || ''}
                            onChange={e => handleChange(i, 'date', e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300" />
                    </div>
                </div>
            ))}
            <button onClick={addPayment}
                className="w-full flex items-center justify-center gap-1.5 border border-dashed border-stone-300 rounded-xl py-2 text-xs text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Payment
            </button>
            {payments.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-3 flex justify-between items-center border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Auto Total (will save)</p>
                    <p className="text-sm font-bold text-amber-700">₹{displayTotal.toLocaleString('en-IN')}</p>
                </div>
            )}
        </div>
    );
}

// ─── Subsidy status options ───────────────────────────────────────────────────
const SUBSIDY_STATUS_OPTIONS = ['Pending', 'Submitted', 'Rejected', 'Redeemed', 'Disbursed'];

// ─── CustomerDetailModal ──────────────────────────────────────────────────────
export default function CustomerDetailModal({ customer, onClose, onUpdate, onDelete, user, meta = {} }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [editingSection, setEditingSection] = useState(null);
    const [editData, setEditData] = useState({ ...customer });
    const [followUpText, setFollowUpText] = useState('');
    const [saving, setSaving] = useState(false);
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
        setEditData({ ...customer });
        setLocalChecklist(normalizeChecklist(customer.project_checklist, customer));
        fetchLogs();
    }, [customer.id]);

    useEffect(() => {
        setLocalChecklist(normalizeChecklist(customer.project_checklist, customer));
        setEditData(prev => ({
            ...prev,
            project_checklist: customer.project_checklist,
            payments: customer.payments,
            follow_ups: customer.follow_ups,
            subsidy_history: customer.subsidy_history
        }));
    }, [customer.project_checklist, customer.payments, customer.follow_ups, customer.subsidy_history]);

    // ── Auto-recalculate receivables whenever money fields change ──────────────
    // receivables = quoted_amount − discount − total_received  (floor 0)
    const recalcFinancials = (patch, current) => {
        const merged = { ...current, ...patch };
        const quoted = Number(merged.quoted_amount) || 0;
        const discount = Number(merged.discount) || 0;
        const received = Number(merged.total_received) || 0;
        const receivables = Math.max(0, quoted - discount - received);
        return { ...patch, receivables, total_cost: quoted };
    };

    const handleChange = (field, val) => {
        const FINANCE_FIELDS = ['quoted_amount', 'discount', 'total_received'];
        if (FINANCE_FIELDS.includes(field)) {
            setEditData(prev => {
                const patch = recalcFinancials({ [field]: val }, prev);
                return { ...prev, ...patch };
            });
        } else {
            setEditData(prev => {
                const updated = { ...prev, [field]: val };
                if (field === 'project_type') {
                    updated.financial_tag = "";
                }
                return updated;
            });
        }
    };

    // Payments: auto-update total_received from sum AND recalc receivables
    const handlePaymentsChange = (newPayments, total) => {
        setEditData(prev => {
            const patch = recalcFinancials({ payments: newPayments, total_received: total }, prev);
            return { ...prev, ...patch };
        });
    };

    const handleToggleFinancialTag = async (tagId) => {
        const newTag = editData.financial_tag === tagId ? null : tagId;
        setEditData(prev => ({ ...prev, financial_tag: newTag }));
        await onUpdate(customer.id, { financial_tag: newTag });
        const tagLabel = FINANCIAL_TAGS.find(t => t.id === tagId)?.label || tagId;
        logActivity(user.id, 'update', `${customer.customer_name}: Financial tag - ${tagLabel}`, customer.id);
        fetchLogs();
    };

    const handleSave = async () => {
        setSaving(true);
        const updates = { ...editData };
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

    const handleSoftDelete = async () => {
        const deletedAt = new Date().toISOString();
        await logActivity(user.id, 'delete', `Soft-deleted: ${customer.customer_name}`, customer.id);
        await onDelete(customer.id, deletedAt);   // pass timestamp for soft-delete
        onClose();
    };

    const SectionHeader = ({ title, id, icon: Icon }) => (
        <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-1.5 mt-6">
            <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                <Icon size={12} /> {title}
            </h3>
            <button onClick={() => setEditingSection(editingSection === id ? null : id)} className="text-stone-400 hover:text-amber-600 transition-colors">
                {editingSection === id ? <X size={14} /> : <Edit3 size={12} />}
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-5xl h-[94vh] overflow-hidden flex flex-col border border-stone-100">

                {/* Header */}
                <div className="bg-stone-900 px-6 py-5 flex justify-between items-center flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-white">{customer.customer_name}</h2>
                            <span className="text-[9px] bg-white/10 text-stone-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{customer.crn || 'NO-CRN'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            {customer.google_maps_location_link && (
                                <a href={customer.google_maps_location_link} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1.5 bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[9px] font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">
                                    <MapPin size={10} /> VIEW MAPS
                                </a>
                            )}
                            {customer.google_drive_docs_link && (
                                <a href={customer.google_drive_docs_link} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1.5 bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[9px] font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                                    <FolderOpen size={10} /> GOOGLE DRIVE
                                </a>
                            )}
                        </div>
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
                        // { id: 'project_and_technical', label: "Project & Technical", icon: Zap },
                        { id: 'finance', label: 'Finance & Bank', icon: IndianRupee },
                        { id: 'checklist', label: 'Checklist', icon: CheckSquare },
                        { id: 'history', label: 'Notes & History', icon: History },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setEditingSection(null); }}
                            className={`flex items-center gap-2 py-3 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab.id ? 'text-amber-400 border-amber-400' : 'text-stone-500 border-transparent hover:text-stone-300'}`}>
                            <tab.icon size={12} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-[#FCFBFA]">

                    {/* ── OVERVIEW ── */}
                    {activeTab === 'overview' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Stage select */}
                                <div className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                    <label className="text-[9px] text-stone-400 font-bold uppercase mb-1.5 block">Primary Stage</label>
                                    <select value={editData.stage} onChange={async (e) => {
                                        const newStage = e.target.value;
                                        const oldStage = editData.stage;
                                        setEditData(prev => ({ ...prev, stage: newStage }));
                                        await onUpdate(customer.id, { stage: newStage });
                                        await logActivity(user.id, 'stage_change', `STAGE: ${oldStage} → ${newStage}`, customer.id);
                                        fetchLogs();
                                    }} className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-bold text-stone-700 outline-none">
                                        {PRIMARY_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                    <label className="text-[9px] text-stone-400 font-bold uppercase mb-1.5 block">Financial Tag</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {getFinancialTags(editData.project_type).map(tagId => {
                                            const isActive = editData.financial_tag === tagId;
                                            const colors = FINANCIAL_TAG_COLORS[tagId] || { bg: 'bg-stone-50', text: 'text-stone-700', border: 'border-stone-200', dot: 'bg-stone-400' };
                                            return (
                                                <button key={tagId} onClick={() => handleToggleFinancialTag(tagId)}
                                                    className={`inline-flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-full font-bold border transition-all ${isActive ? `${colors.bg} ${colors.text} ${colors.border}` : 'bg-stone-50 text-stone-400 border-transparent hover:border-stone-200'}`}>
                                                    {isActive && <span className={`w-1 h-1 rounded-full ${colors.dot}`} />}
                                                    {tagId}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Customer Info */}
                            <section>
                                <SectionHeader title="Customer Info" id="cus" icon={User} />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <EditableDetailItem label="Customer Name" field="customer_name" value={editData.customer_name} onChange={handleChange} isEditing={editingSection === 'cus'} />
                                    <EditableDetailItem label="Phone Number" field="phone_number" value={editData.phone_number} onChange={handleChange} isEditing={editingSection === 'cus'} />
                                    <EditableDetailItem label="AREA" field="area" value={editData.area} onChange={handleChange} isEditing={editingSection === 'cus'} />
                                    <EditableDetailItem label="Full Installation Address" field="full_installation_address" value={editData.full_installation_address} onChange={handleChange} isEditing={editingSection === 'cus'} noTruncate type="textarea" className="col-span-2 md:col-span-3" />
                                    <EditableDetailItem label="Google Drive / Docs Link" field="google_drive_docs_link" value={editData.google_drive_docs_link} onChange={handleChange} isEditing={editingSection === 'cus'} />
                                    <EditableDetailItem label="Google Maps Location Link" field="google_maps_location_link" value={editData.google_maps_location_link} onChange={handleChange} isEditing={editingSection === 'cus'} />
                                </div>
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    <section>
                                        <SectionHeader title="Project & Technical" id="pro" icon={Zap} />
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <EditableDetailItem label="System Capacity (kWp)" field="system_capacity_kwp" value={editData.system_capacity_kwp} onChange={handleChange} type="number" isEnergy isEditing={editingSection === 'pro'} />
                                            <EditableDetailItem label="APPLICATION NO" field="application_no" value={editData.application_no} onChange={handleChange} isEditing={editingSection === 'pro'} />
                                            <EditableDetailItem label="PANEL" field="panel" value={editData.panel} onChange={handleChange} options={meta['panel']} category="panel" isEditing={editingSection === 'pro'} />
                                            <EditableDetailItem label="INVERTER" field="inverter" value={editData.inverter} onChange={handleChange} options={meta['inverter']} category="inverter" isEditing={editingSection === 'pro'} />
                                            <EditableDetailItem label="DATE OF REGISTRATION" field="date_of_registration" value={editData.date_of_registration} onChange={handleChange} type="date" isEditing={editingSection === 'pro'} />
                                            <EditableDetailItem label="METER PHASE" field="meter_phase" value={editData.meter_phase} onChange={handleChange} options={meta['meter_phase']} category="meter_phase" isEditing={editingSection === 'pro'} />
                                            <EditableDetailItem label="Consumer Number" field="consumer_number" value={editData.consumer_number} onChange={handleChange} isEditing={editingSection === 'pro'} />
                                        </div>
                                    </section>
                                </div>
                                {/* <SectionHeader title="Financial Summary" id="fin" icon={IndianRupee} />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <EditableDetailItem label="Quoted Amt" field="quoted_amount" value={editData.quoted_amount} onChange={handleChange} type="number" isEditing={editingSection === 'fin'} isMoney />
                                    <EditableDetailItem label="Quoted Amount with Remarks" field="quoted_amount_2" value={editData.quoted_amount_2} onChange={handleChange} isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Payment Reciept" field="payment_reciept" value={editData.payment_reciept} onChange={handleChange} type="date" isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Payment Notes" field="payment_notes" value={editData.payment_notes} onChange={handleChange} isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Project Type" field="project_type" value={editData.project_type} onChange={handleChange} options={meta?.['project_type'] || []} category="project_type" isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Payment Type" field="payment_type" value={editData.payment_type} onChange={handleChange} options={meta?.['payment_type'] || []} category="payment_type" isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Last Transaction Id" field="last_transaction_id" value={editData.last_transaction_id} onChange={handleChange} isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Remarks" field="quoted_amount_2" value={editData.quoted_amount_2} onChange={handleChange} isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Subsidy Claim" field="subsidy_claim" value={editData.subsidy_claim} onChange={handleChange} type="date" isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Subsidy Received" field="subsidy_received" value={editData.subsidy_received} onChange={handleChange} type="date" isEditing={editingSection === 'fin'} />
                                </div> */}
                            </section>


                        </div>

                    )}


                    {/* Project & Technical */}
                    {/* {activeTab === 'project_and_technical' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <section>
                                <SectionHeader title="Project & Technical" id="pro" icon={Zap} />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <EditableDetailItem label="System Capacity (kWp)" field="system_capacity_kwp" value={editData.system_capacity_kwp} onChange={handleChange} type="number" isEnergy isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="APPLICATION NO" field="application_no" value={editData.application_no} onChange={handleChange} isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="PANEL" field="panel" value={editData.panel} onChange={handleChange} options={meta['panel']} category="panel" isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="INVERTER" field="inverter" value={editData.inverter} onChange={handleChange} options={meta['inverter']} category="inverter" isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="DATE OF REGISTRATION" field="date_of_registration" value={editData.date_of_registration} onChange={handleChange} type="date" isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="METER PHASE" field="meter_phase" value={editData.meter_phase} onChange={handleChange} options={meta['meter_phase']} category="meter_phase" isEditing={editingSection === 'pro'} />
                                    <EditableDetailItem label="Consumer Number" field="consumer_number" value={editData.consumer_number} onChange={handleChange} isEditing={editingSection === 'pro'} />
                                </div>
                            </section>
                        </div>
                    )} */}



                    {/* ── FINANCE & BANK ── */}
                    {activeTab === 'finance' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Project Type */}
                                <div className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                    <label className="text-[9px] text-stone-400 font-bold uppercase mb-1.5 block">Project Type</label>
                                    <select value={editData.project_type || 'General'} onChange={async (e) => {
                                        const newType = e.target.value;
                                        setEditData(prev => ({ ...prev, project_type: newType, financial_tag: "" }));
                                        await onUpdate(customer.id, { project_type: newType, financial_tag: "" });
                                        await logActivity(user.id, 'update', `${customer.customer_name}: Project Type changed to ${newType}`, customer.id);
                                        fetchLogs();
                                    }} className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-bold text-stone-700 outline-none">
                                        <option value="General">General</option>
                                        <option value="PM SURYA">PM SURYA</option>
                                    </select>
                                </div>

                                {/* Financial Tag */}
                                <div className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                    <label className="text-[9px] text-stone-400 font-bold uppercase mb-1.5 block">Financial Tag</label>
                                    <select value={editData.financial_tag || ''} onChange={async (e) => {
                                        const newTag = e.target.value;
                                        setEditData(prev => ({ ...prev, financial_tag: newTag }));
                                        await onUpdate(customer.id, { financial_tag: newTag });
                                        await logActivity(user.id, 'update', `${customer.customer_name}: Financial Tag updated to ${newTag}`, customer.id);
                                        fetchLogs();
                                    }} className="w-full p-2.5 bg-white border border-stone-200 rounded-xl font-bold text-stone-700 outline-none">
                                        <option value="">Select Tag...</option>
                                        {getFinancialTags(editData.project_type).map(tag => (
                                            <option key={tag} value={tag}>{tag}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <section>
                                <SectionHeader title="Financial Summary" id="fin" icon={IndianRupee} />
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">

                                    <EditableDetailItem label="Quoted Amt" field="quoted_amount" value={editData.quoted_amount} onChange={handleChange} type="number" isEditing={editingSection === 'fin'} isMoney />
                                    <EditableDetailItem 
                                        label="Payment Type" 
                                        field="payment_type" 
                                        value={editData.payment_type} 
                                        onChange={handleChange} 
                                        options={meta?.['payment_type'] || []} 
                                        category="payment_type" 
                                        isEditing={editingSection === 'fin'} 
                                    />
                                    <EditableDetailItem label="Last Transaction Id" field="last_transaction_id" value={editData.last_transaction_id} onChange={handleChange} isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Date" field="date" value={editData.date} onChange={handleChange} type="date" isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Remarks" field="quoted_amount_2" value={editData.quoted_amount_2} onChange={handleChange} isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Subsidy Claim" field="subsidy_claim" value={editData.subsidy_claim} onChange={handleChange} type="date" isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Subsidy Received" field="subsidy_received" value={editData.subsidy_received} onChange={handleChange} type="date" isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Payment Reciept" field="payment_reciept" value={editData.payment_reciept} onChange={handleChange} type="date" isEditing={editingSection === 'fin'} />
                                    <EditableDetailItem label="Payment Notes" field="payment_notes" value={editData.payment_notes} onChange={handleChange} isEditing={editingSection === 'fin'} />
                                </div>
                            </section>
                            {/* <section>
                                            <SectionHeader title="Financial Summary" id="fin" icon={IndianRupee} />
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                                                <EditableDetailItem label="Quoted Amt"  field="quoted_amount"  value={editData.quoted_amount}  onChange={handleChange} type="number" isEditing={editingSection === 'fin'} isMoney />
                                                <EditableDetailItem label="Received"    field="total_received"  value={editData.total_received} onChange={handleChange} type="number" isEditing={editingSection === 'fin'} isMoney />
                                                <EditableDetailItem label="Receivable"  field="receivables"     value={editData.receivables}    onChange={handleChange} type="number" isEditing={editingSection === 'fin'} isMoney />
                                                <EditableDetailItem label="Discount"    field="discount"        value={editData.discount}       onChange={handleChange} type="number" isEditing={editingSection === 'fin'} isMoney />
                                                <EditableDetailItem label="Pay Type"    field="payment_type"    value={editData.payment_type}   onChange={handleChange} options={meta['payment_type']} category="payment_type" isEditing={editingSection === 'fin'} />
                                            </div>
                                            <PaymentsEditor
                                                payments={editData.payments || []}
                                                onChange={handlePaymentsChange}
                                                isEditing={editingSection === 'fin'}
                                            />
                                        </section> */}

                            {/* Subsidy — uses generic HistoryEntryEditor */}
                            {/* <section>
                                            <SectionHeader title="Subsidy Status History" id="sub" icon={Banknote} />
                                            <HistoryEntryEditor
                                                entries={editData.subsidy_history || []}
                                                onChange={val => handleChange('subsidy_history', val)}
                                                isEditing={editingSection === 'sub'}
                                                statusOptions={SUBSIDY_STATUS_OPTIONS}
                                                title="Subsidy Entry"
                                                emptyText="No subsidy history recorded"
                                            />
                                        </section> */}
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
                                <h4 className="text-[9px] font-bold text-stone-400 mb-2.5 uppercase tracking-widest border-b border-stone-50 pb-1.5">Add Custom Checklist Item</h4>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="e.g. Verify solar net meter application..." value={newItemLabel}
                                        onChange={e => setNewItemLabel(e.target.value)}
                                        className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-400" />
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
                                    }} className="bg-stone-900 text-white px-3.5 rounded-lg text-xs font-bold hover:bg-stone-800 transition-all flex items-center gap-1.5">
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {sections.map(sec => (
                                    <div key={sec} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm">
                                        <h4 className="text-[9px] font-bold text-stone-400 mb-3 uppercase tracking-widest border-b border-stone-50 pb-1.5">{sec}</h4>
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
                                                            {item.checked && <span className="text-[8px] text-stone-400 font-bold uppercase mt-0.5 block">By {item.checkedBy} on {formatLogDate(item.checkedAt)}</span>}
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
                                        className="w-full p-4 border rounded-2xl text-xs bg-stone-50 focus:ring-1 focus:ring-amber-400 outline-none" rows={4}
                                        placeholder="Sensitive notes visible only to internal staff..." />
                                ) : (
                                    <div className="bg-stone-100/50 p-4 rounded-2xl border border-stone-200 text-xs text-stone-600 italic">
                                        {editData.internal_remarks || 'No internal remarks recorded yet.'}
                                    </div>
                                )}
                            </section>

                            <section>
                                <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-6">Activity Notes</h3>
                                <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
                                    {(editData.follow_ups || []).slice().reverse().map((f, i) => (
                                        <div key={i} className="bg-white p-3.5 rounded-xl border border-stone-100 shadow-sm">
                                            <p className="text-xs text-stone-800 leading-relaxed">{f.text}</p>
                                            <div className="flex justify-between mt-2.5 text-[8px] text-stone-400 font-bold uppercase">
                                                <span>{f.author}</span><span>{formatLogDate(f.date)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input value={followUpText} onChange={e => setFollowUpText(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                                        placeholder="Share an update with the team..."
                                        className="flex-1 px-4 py-3 bg-white border border-stone-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-amber-400" />
                                    <button onClick={handleAddNote} className="bg-stone-900 text-white px-6 rounded-xl hover:bg-stone-800 transition-all">
                                        <Send size={16} />
                                    </button>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-6">Detailed System History</h3>
                                <div className="space-y-4">
                                    {activityLogs.length > 0 ? activityLogs.map((log, i) => (
                                        <div key={i} className="relative pl-6 pb-4 border-l border-stone-100 last:border-0">
                                            <div className="absolute -left-[4.5px] top-0 w-2 h-2 rounded-full bg-white border-2 border-amber-500 shadow-sm" />
                                            <div className="bg-white p-3 rounded-xl border border-stone-100 shadow-sm -mt-1.5 hover:border-amber-200 transition-colors">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${ACTION_COLORS[log.action] || 'bg-stone-100 text-stone-600'}`}>{log.action}</span>
                                                    <span className="text-[8px] text-stone-400 font-bold">{formatLogDate(log.created_at)}</span>
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
                                                <p className="text-[8px] text-stone-400 font-bold uppercase mt-2 border-t border-stone-50 pt-1.5">User: {log.profiles?.name || 'System'}</p>
                                            </div>
                                        </div>
                                    )) : <p className="text-[8px] text-stone-400 italic">No timeline entries found.</p>}
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
