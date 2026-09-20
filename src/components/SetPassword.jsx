import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { ShieldCheck, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SetPassword() {
    const savingRef = useRef(false);
    const [status, setStatus] = useState('checking'); // checking | ready | invalid | saving | done
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.slice(1));
        if (params.has('error') || params.has('error_code')) { setStatus('invalid'); return; }
        // Supabase fires PASSWORD_RECOVERY when the recovery link's token
        // is picked up from the URL. Sign-in happens automatically.
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' && session) {
                setStatus('ready');
            }
        });

        // Fallback: if the event already fired before this component mounted,
        // check for an existing session directly.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setStatus(prev => (prev === 'checking' ? 'ready' : prev));
            else setStatus(prev => (prev === 'checking' ? 'invalid' : prev));
        }).catch(() => setStatus('invalid'));

        return () => listener.subscription.unsubscribe();
    }, []);

    const handleSubmit = async () => {
        setError('');
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (password !== confirm) { setError('Passwords do not match.'); return; }

        if (savingRef.current) return;
        savingRef.current = true;
        setStatus('saving');
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;
            setPassword(''); setConfirm('');
            setStatus('done');
        } catch (error) {
            setError(error.message || 'Unable to update password. Please try again.');
            setStatus('ready');
        } finally { savingRef.current = false; }

    };

    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 w-full max-w-sm overflow-hidden">
                <div className="bg-stone-900 px-6 py-5 flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-white" />
                    <h1 className="text-white font-semibold text-lg">Reset Your Password</h1>
                </div>

                <div className="p-6 space-y-4">
                    {status === 'checking' && (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <div className="w-6 h-6 border-4 border-stone-900 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-stone-500">Verifying your link...</p>
                        </div>
                    )}

                    {status === 'invalid' && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-700 text-sm font-medium">Link expired or invalid</p>
                                <p className="text-red-600 text-xs mt-1">
                                    Ask your admin to resend the password reset email, then open the new link directly.
                                </p>
                            </div>
                        </div>
                    )}

                    {(status === 'ready' || status === 'saving') && (
                        <>
                            <p className="text-sm text-stone-500">Choose a password for your account. You'll use this to log in going forward.</p>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-600 text-xs">{error}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-stone-600 mb-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        id="new-password" autoComplete="new-password" placeholder="Min. 8 characters"
                                        className="w-full px-3 py-2.5 pr-10 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                    />
                                    <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-stone-400 hover:text-stone-600">
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-stone-600 mb-1">Confirm Password</label>
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    id="confirm-password" autoComplete="new-password" placeholder="Re-enter password"
                                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={status === 'saving'}
                                className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium disabled:opacity-50"
                            >
                                {status === 'saving' ? 'Saving...' : 'Set Password'}
                            </button>
                        </>
                    )}

                    {status === 'invalid' && <a href={import.meta.env.BASE_URL} className="block text-sm underline">Back to login to request a new link</a>}
                    {status === 'done' && (
                        <div className="flex flex-col items-center gap-3 py-4 text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-700" />
                            <p className="text-stone-800 font-medium">Password set successfully</p>
                            <p className="text-stone-500 text-xs">You can now log in with your new password.</p>
                            <button onClick={async () => {
                                const { error } = await supabase.auth.signOut({ scope: 'local' });
                                if (error) { setError('Password saved. Please try signing out again.'); return; }
                                window.location.assign(import.meta.env.BASE_URL);
                            }} className="mt-2 text-sm font-medium text-stone-900 underline">Go to login</button>
                            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}