import { useEffect, useRef, useState } from 'react';

export function useUnsavedChanges({ dirty, busy = false, save, discard, close }) {
    const [pending, setPending] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const locked = useRef(false);
    const request = (action = close) => {
        if (busy || locked.current) return;
        if (!dirty) return action();
        setError('');
        setPending(() => action);
    };
    useEffect(() => {
        const unload = event => { if (dirty || busy || saving) { event.preventDefault(); event.returnValue = ''; } };
        const escape = event => {
            if (event.key !== 'Escape' || event.defaultPrevented) return;
            event.preventDefault();
            if (pending) { if (!locked.current) setPending(null); }
            else request();
        };
        window.addEventListener('beforeunload', unload);
        document.addEventListener('keydown', escape);
        return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('keydown', escape); };
    }, [dirty, busy, saving, pending, close]);
    const confirmSave = async () => {
        if (locked.current || busy) return;
        locked.current = true; setSaving(true); setError('');
        try {
            const result = await save();
            if (result === false) throw new Error('Please check the form and try again.');
            const action = pending;
            setPending(null);
            action?.();
        } catch (err) { setError(err.message || 'Unable to save. Your changes are still here.'); }
        finally { locked.current = false; setSaving(false); }
    };
    return { request, dialog: pending ? { saving: saving || busy, error,
        onKeep: () => { if (!locked.current) setPending(null); },
        onLeave: () => { if (busy || locked.current) return; discard(); const action = pending; setPending(null); action(); },
        onSave: confirmSave } : null };
}

export default function UnsavedChanges({ saving, error, onKeep, onLeave, onSave, saveLabel = 'Save changes', allowLeave = true }) {
    const box = useRef(null);
    useEffect(() => {
        const previous = document.activeElement;
        box.current?.querySelector('button')?.focus();
        return () => { if (previous?.isConnected) previous.focus(); };
    }, []);
    return <div className="fixed inset-0 z-[80] bg-stone-950/55 backdrop-blur-sm flex items-center justify-center p-4">
        <div ref={box} role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title" aria-describedby="unsaved-description"
            onKeyDown={event => {
                if (event.key !== 'Tab') return;
                const buttons = [...box.current.querySelectorAll('button:not(:disabled)')];
                if (!buttons.length) { event.preventDefault(); return; }
                const first = buttons[0], last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }} className={`bg-white p-7 shadow-2xl w-full ${allowLeave ? 'rounded-[28px] max-w-lg' : 'rounded-xl max-w-[400px] min-h-[240px] flex flex-col border border-stone-200'}`}>
            <h2 id="unsaved-title" className="text-xl font-semibold text-stone-900">You have unsaved changes</h2>
            <p id="unsaved-description" className="text-sm text-stone-600 mt-3">{allowLeave ? 'Save your changes before leaving, or keep editing. Leaving without saving will discard your draft.' : 'Save your changes to continue, or return to editing.'}</p>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className={allowLeave ? "flex flex-wrap gap-3 mt-6" : "grid grid-cols-2 gap-3 mt-auto pt-7"}>
                <button disabled={saving} onClick={onKeep} className="px-4 py-3 rounded-lg border border-stone-200 text-sm font-semibold disabled:opacity-40">Keep editing</button>
                {allowLeave && <button disabled={saving} onClick={onLeave} className="px-4 py-3 rounded-xl text-sm text-red-600 font-semibold disabled:opacity-40">Leave</button>}
                <button disabled={saving} onClick={onSave} className="px-4 py-3 rounded-lg bg-stone-900 text-white text-sm font-semibold disabled:opacity-40">{saving ? 'Saving…' : saveLabel}</button>
            </div>
        </div>
    </div>;
}
