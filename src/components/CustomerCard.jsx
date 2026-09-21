import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MapPin, Zap, Phone } from 'lucide-react';
import { quotationAmount, receivableAmount } from '../quotation.js';
import { PRIMARY_STAGES } from '../constants';
import { formatIndianCurrency } from '../utils';

export default function CustomerCard({ customer, onSelect, onMoveStage, canSeeFinance = false }) {
    const [stage, setStage] = useState(customer.stage || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const savingRef = useRef(false);
    useEffect(() => { setStage(customer.stage || ''); setError(''); }, [customer.id, customer.stage]);
    const saveStage = async () => {
        if (savingRef.current || !stage || stage === customer.stage) return;
        savingRef.current = true;
        setSaving(true); setError('');
        try { await onMoveStage(customer.id, stage); }
        catch { setError('Could not save stage. Try again.'); }
        finally { savingRef.current = false; setSaving(false); }
    };
    const outstanding = receivableAmount(customer);
    const money = value => formatIndianCurrency(value, false);
    return (
        <article className="group w-full h-[270px] min-w-0 bg-white rounded-[22px] border border-stone-100 border-l-4 border-l-amber-400 shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <button type="button" onClick={() => onSelect(customer)}
                aria-label={`Open customer ${customer.customer_name || customer.crn || ''}`}
                className="w-full min-w-0 flex-1 px-4 pt-4 pb-3 text-left rounded-t-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 flex flex-col">
                <span className="flex items-start justify-between gap-2 min-h-10">
                    <span title={customer.customer_name} className="min-w-0 line-clamp-2 break-words text-base font-semibold text-stone-800 leading-5">
                        {customer.customer_name || 'Unnamed customer'}
                    </span>
                    <span title={customer.crn} className="shrink-0 max-w-[120px] truncate rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-500">
                        {customer.crn || 'No CRN'}
                    </span>
                </span>
                <span className="flex items-center gap-3 mt-3 text-sm text-stone-600">
                    <span className="flex items-center gap-1.5 min-w-0 flex-1"><MapPin size={14} className="shrink-0 text-stone-400" /><span title={customer.area} className="truncate">{customer.area || 'Area not added'}</span></span>
                    <span className="flex items-center gap-1 shrink-0"><Zap size={14} className="text-amber-500" />{customer.system_capacity_kwp ? `${customer.system_capacity_kwp} kWp` : '– kWp'}</span>
                </span>
                <span className="flex items-center gap-1.5 mt-2 text-sm text-stone-600">
                    <Phone size={14} className="shrink-0 text-stone-400" />
                    <span>{customer.phone_number || 'Phone not added'}</span>
                </span>
                {canSeeFinance && <span className="grid grid-cols-3 gap-2 w-full mt-auto pt-4">
                    {[
                        ['Quoted', quotationAmount(customer), 'text-stone-800'],
                        ['Received', Number(customer.total_received) || 0, 'text-emerald-700'],
                        ['Receivable', outstanding, outstanding > 0 ? 'text-amber-700' : 'text-emerald-700'],
                    ].map(([label, value, color]) => <span key={label} className="min-w-0">
                        <span className="block text-xs text-stone-500 mb-1">{label}</span>
                        <span className={`block text-sm tabular-nums font-semibold break-words ${color}`}>{money(value)}</span>
                    </span>)}
                </span>}
            </button>
            <div className="px-4 pb-3 pt-2 border-t border-stone-100">
                <div className="flex gap-2">
                    <select aria-label={`Stage for ${customer.customer_name}`} value={stage} disabled={saving}
                        onChange={event => { setStage(event.target.value); setError(''); }}
                        className="min-w-0 flex-1 bg-white border border-stone-200 rounded-xl px-2 py-2 text-sm text-stone-700 disabled:opacity-60">
                        {!PRIMARY_STAGES.some(option => option.id === stage) && <option value={stage}>{stage || 'Select stage'}</option>}
                        {PRIMARY_STAGES.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                    <button type="button" onClick={saveStage} disabled={saving || !stage || stage === customer.stage}
                        aria-label="Save stage" title={saving ? 'Saving stage…' : 'Save selected stage'}
                        className="shrink-0 px-2.5 bg-stone-900 text-white rounded-xl disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-amber-500">
                        <ArrowRight size={16} />
                    </button>
                </div>
                {error && <p role="alert" className="text-xs text-red-700 mt-1">{error}</p>}
            </div>
        </article>
    );
}
