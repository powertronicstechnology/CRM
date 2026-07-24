// ─── AddLeadModal.jsx ─────────────────────────────────────────────────────────
// Modal form for creating a new lead with specified layout and validation.
// ──────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { DEFAULT_PROJECT_CHECKLIST } from '../models';

export default function AddLeadModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        customer_name: '',
        phone_number: '',
        area: '',
        system_capacity_kwp: '',
        full_installation_address: '', // Full Address (optional)
        quoted_amount: '',
        project_type: 'General', // Dropdown options: General / PM SURYA
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

    const handleSave = async () => {
        if (!form.customer_name || !form.customer_name.trim()) { setError('Customer name is required'); return; }
        if (!form.phone_number || !form.phone_number.trim())   { setError('Phone number is required'); return; }
        setSaving(true);
        setError('');
        try {
            await onSave({
                ...form,
                quoted_amount: form.quoted_amount ? Number(form.quoted_amount) : null,
                total_cost: form.quoted_amount ? Number(form.quoted_amount) : null,
                system_capacity_kwp:  form.system_capacity_kwp  ? Number(form.system_capacity_kwp)  : null,
                payments: [],
                follow_ups: [],
                project_checklist: DEFAULT_PROJECT_CHECKLIST,
                subsidy_history: [],
                total_received: 0,
                stage: 'REGISTRATION PENDING',
            });
        } catch (err) {
            setError(err.message || 'An error occurred while saving.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-stone-900 px-5 py-4 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-lg font-bold text-white">Add New Lead</h2>
                    <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg font-medium">{error}</p>}

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Name *</label>
                        <input type="text" value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="e.g. John Doe" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Phone Number *</label>
                        <input type="tel" value={form.phone_number} 
                            onChange={e => set('phone_number', e.target.value.replace(/[^0-9+\s-]/g, ''))}
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="e.g. +91 9876543210" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Area</label>
                        <input type="text" value={form.area} onChange={e => set('area', e.target.value)}
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="e.g. Sector 5" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Capacity (kWp)</label>
                        <input type="number" step="0.1" value={form.system_capacity_kwp} onChange={e => set('system_capacity_kwp', e.target.value)}
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="e.g. 5.5" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Full Address (Optional)</label>
                        <textarea value={form.full_installation_address} onChange={e => set('full_installation_address', e.target.value)} rows={2}
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" placeholder="e.g. 123 Main Street" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Quoted Amount (₹)</label>
                        <input type="number" value={form.quoted_amount} onChange={e => set('quoted_amount', e.target.value)}
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="e.g. 150000" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-stone-600 mb-1">Project Type *</label>
                        <select value={form.project_type} onChange={e => set('project_type', e.target.value)}
                            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white">
                            <option value="General">General</option>
                            <option value="PM SURYA">PM SURYA</option>
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
