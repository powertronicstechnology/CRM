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
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-left"
            onKeyDown={event => {
                if (event.key !== 'Tab') return;
                const buttons = [...box.current.querySelectorAll('button:not(:disabled)')];
                const first = buttons[0], last = buttons[buttons.length - 1];
                if (!first) { event.preventDefault(); return; }
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }}>
            <h2 id={titleId} className="text-lg font-semibold text-stone-900">Move customer?</h2>
            <p className="mt-3 text-base font-semibold text-stone-800">{customerName || 'Customer'}</p>
            <p className="mt-1 text-sm text-stone-500">CRN: {crn || 'Not assigned'}</p>
            <p className="mt-4 text-sm leading-relaxed text-stone-600">Move from <strong className="text-stone-800">{fromStage || 'No stage'}</strong> to <strong className="text-stone-800">{label}</strong>?</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-3">
                <button type="button" disabled={saving} onClick={onCancel} className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm disabled:opacity-50">Cancel</button>
                <button type="button" disabled={saving} onClick={confirm} className="rounded-xl bg-stone-900 text-white px-4 py-2.5 text-sm disabled:opacity-50">{saving ? 'Changing…' : 'Yes, change stage'}</button>
            </div>
        </div>
    </div>;
}
