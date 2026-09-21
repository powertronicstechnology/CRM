import { ArrowRight, ArrowRightLeft } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

export default function StageChangeConfirm({ label, customerName, crn, fromStage, onConfirm, onCancel }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const locked = useRef(false), box = useRef(null);
    const titleId = useId();
    useEffect(() => {
        const previous = document.activeElement;
        box.current?.querySelector('button')?.focus();
        const escape = event => {
            if (event.key === 'Escape') {
                event.preventDefault(); event.stopImmediatePropagation();
                if (!locked.current) onCancel();
            }
        };
        document.addEventListener('keydown', escape, true);
        return () => { document.removeEventListener('keydown', escape, true); if (previous?.isConnected) previous.focus(); };
    }, []);
    const confirm = async () => {
        if (locked.current) return;
        locked.current = true; setSaving(true); setError('');
        try {
            if (await onConfirm() === false) throw new Error('Could not change stage. Please try again.');
            onCancel();
        } catch { setError('Could not change stage. Please try again.'); }
        finally { locked.current = false; setSaving(false); }
    };
    return <div className="fixed inset-0 z-[90] bg-stone-950/50 flex items-center justify-center p-4" onClick={event => event.stopPropagation()}>
        <div ref={box} role="alertdialog" aria-modal="true" aria-labelledby={titleId}
            className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-xl text-left"
            onKeyDown={event => {
                if (event.key !== 'Tab') return;
                const buttons = [...box.current.querySelectorAll('button:not(:disabled)')];
                const first = buttons[0], last = buttons[buttons.length - 1];
                if (!first) { event.preventDefault(); return; }
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }}>
            <div className="flex items-center gap-2.5 text-stone-500">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600"><ArrowRightLeft size={18} aria-hidden="true" /></span>
                <h2 id={titleId} className="text-sm font-semibold">Confirm stage change</h2>
            </div>
            <p className="mt-5 text-[22px] leading-snug font-semibold tracking-tight text-stone-900 break-words">{customerName || 'Customer'}</p>
            <span className="inline-flex mt-2 rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">CRN · {crn || 'Not assigned'}</span>
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
                <div className="rounded-2xl bg-stone-50 border border-stone-100 p-4">
                    <p className="text-xs font-medium text-stone-500 mb-1.5">From</p>
                    <p className="text-sm font-semibold leading-relaxed text-stone-700">{fromStage || 'No stage'}</p>
                </div>
                <ArrowRight size={18} className="self-center text-stone-400" aria-hidden="true" />
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                    <p className="text-xs font-medium text-amber-700 mb-1.5">To</p>
                    <p className="text-sm font-semibold leading-relaxed text-amber-900">{label}</p>
                </div>
            </div>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3">
                <button type="button" disabled={saving} onClick={onCancel} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm disabled:opacity-50">Cancel</button>
                <button type="button" disabled={saving} onClick={confirm} className="rounded-xl bg-stone-900 text-white px-4 py-2.5 text-sm disabled:opacity-50">{saving ? 'Changing…' : 'Yes, change stage'}</button>
            </div>
        </div>
    </div>;
}
