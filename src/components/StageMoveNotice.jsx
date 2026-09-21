import { useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function StageMoveNotice({ notice, onClose }) {
    const button = useRef(null);
    useEffect(() => {
        const previous = document.activeElement;
        // Focus after the confirmation dialog has closed and restored its focus.
        const timer = setTimeout(() => button.current?.focus(), 0);
        const handleKey = event => {
            if (event.key === 'Escape' || event.key === 'Tab') {
                event.preventDefault();
                event.stopImmediatePropagation();
                if (event.key === 'Escape') onClose();
                else button.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKey, true);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKey, true);
            if (previous?.isConnected) previous.focus();
        };
    }, []);
    return <div className="fixed inset-0 z-[100] bg-stone-950/50 flex items-center justify-center p-4">
        <div role="alertdialog" aria-modal="true" aria-labelledby="stage-move-title" aria-describedby="stage-move-message" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" aria-hidden="true" />
            <h2 id="stage-move-title" className="text-lg font-semibold text-emerald-700">Customer moved successfully</h2>
            <p id="stage-move-message" className="mt-3 text-base text-stone-700 leading-relaxed"><strong>{notice.name}</strong>{notice.crn ? <> ({notice.crn})</> : ''} moved to <strong>{notice.stage}</strong>.</p>
            <button ref={button} type="button" onClick={onClose} className="mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">Got it</button>
        </div>
    </div>;
}
