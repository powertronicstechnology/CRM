// ─── AddLeadModal.jsx ─────────────────────────────────────────────────────────
// Modal form for creating a new lead.
// Branch, POC, project type fields are driven by the Supabase 'metadata' table.
//
// CLIENT CUSTOMISATION:
//   • Change the static input fields in the STATIC_FIELDS array below.
//   • Change metadata-driven dropdowns in the META_FIELDS array below.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { DEFAULT_LEAD_FORM, DEFAULT_PROJECT_CHECKLIST } from '../models';

// Static text/number inputs
const STATIC_FIELDS = [
    { label: 'Customer Name *', field: 'customer_name', type: 'text' },
    { label: 'Phone *',         field: 'phone',          type: 'tel' },
    { label: 'Email',           field: 'email',          type: 'email' },
    { label: 'Location',        field: 'location',       type: 'text' },
    { label: 'Capacity (kWp)',  field: 'capacity_kwp',   type: 'number' },
    { label: 'Quoted Amount (₹)', field: 'quoted_amount', type: 'number' },
];

// Metadata-driven dropdowns — category must match Supabase 'metadata' table
const META_FIELDS = [
    { label: 'Branch', field: 'company_branch', category: 'company_branch' },
    { label: 'POC',    field: 'poc',             category: 'poc' },
];

export default function AddLeadModal({ onClose, onSave, meta }) {
    const [form, setForm] = useState({ ...DEFAULT_LEAD_FORM });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

    const handleSave = async () => {
        if (!form.customer_name.trim()) { setError('Customer name is required'); return; }
        if (!form.phone.trim())         { setError('Phone is required'); return; }
        setSaving(true);
        await onSave({
            ...form,
            quoted_amount: form.quoted_amount ? Number(form.quoted_amount) : null,
            capacity_kwp:  form.capacity_kwp  ? Number(form.capacity_kwp)  : null,
            payments: [],
            follow_ups: [],
            project_checklist: DEFAULT_PROJECT_CHECKLIST,
            subsidy_history: [],
            total_received: 0,
        });
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-stone-900 px-5 py-4 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-bold text-white">Add New Lead</h2>
                    <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}

                    {STATIC_FIELDS.map(({ label, field, type }) => (
                        <div key={field}>
                            <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
                            <input type={type} value={form[field]} onChange={e => set(field, e.target.value)}
                                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        </div>
                    ))}

                    {META_FIELDS.map(({ label, field, category }) => (
                        <div key={field}>
                            <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
                            <select value={form[field]} onChange={e => set(field, e.target.value)}
                                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">
                                <option value="">Select...</option>
                                {(meta[category] || []).map(opt => <option key={opt}>{opt}</option>)}
                            </select>
                        </div>
                    ))}

                    <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1">Project Type</label>
                        <select value={form.project_type} onChange={e => set('project_type', e.target.value)}
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">
                            {(meta['project_type'] || ['On-Grid', 'Hybrid']).map(t => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <div className="border-t p-4 flex gap-3 flex-shrink-0">
                    <button onClick={onClose} className="flex-1 py-2.5 border border-stone-300 text-stone-700 rounded-xl text-sm font-medium">Cancel</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving ? 'Saving...' : <><Plus className="w-4 h-4" /> Add Lead</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
