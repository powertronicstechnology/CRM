// ─── App.jsx ──────────────────────────────────────────────────────────────────
// Root component: auth session management only. Routes to Login or Dashboard.
//
// To customise this CRM for a client, edit:
//   src/constants.js        ← pipeline stages, financial tags, colours
//   src/models.jsx           ← checklist template, lead form defaults
//   src/utils.jsx            ← logActivity, exportAllToCSV, formatters
//   src/components/Dashboard.jsx           ← main layout + data
//   src/components/CustomerCard.jsx
//   src/components/CustomerDetailModal.jsx
//   src/components/AddLeadModal.jsx
//   src/components/FinancialView.jsx
//   src/components/DashboardView.jsx
//   src/components/ActivityLogView.jsx
//   src/components/UserManagementView.jsx
//   src/components/LoginScreen.jsx
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { canEnterPortal } from './access';
import { Sun } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import Dashboard   from './components/Dashboard';
import SetPassword from './components/SetPassword';
import { isPasswordRecovery } from './passwordRecovery.js';

export default function App() {
    const [recovery, setRecovery] = useState(() => isPasswordRecovery(window.location));
    const recoveryRef = useRef(recovery);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe before reading the session so recovery never enters the dashboard.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                recoveryRef.current = true;
                setRecovery(true);
                setUser(null);
                setLoading(false);
            }
            if (event === 'SIGNED_OUT') setUser(null);
        });
        // Restore session on page load
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (recoveryRef.current) { setLoading(false); return; }
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles').select('*').eq('id', session.user.id).single();
                if (recoveryRef.current) { setLoading(false); return; }
                if (canEnterPortal(profile)) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email,
                        name: profile.name,
                        role: profile.role,
                        userType: profile.user_type,
                    });
                } else {
                    // Missing, inactive or unsupported profile: never restore portal access.
                    await supabase.auth.signOut();
                }
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Re-read authorization after role changes or deactivation, including old sessions.
    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        const refreshProfile = async () => {
            const { data: profile, error } = await supabase.from('profiles')
                .select('*').eq('id', user.id).single();
            if (cancelled || error) return;
            if (!canEnterPortal(profile)) {
                await supabase.auth.signOut();
                setUser(null);
                return;
            }
            setUser(previous => previous && ({ ...previous, name: profile.name,
                role: profile.role, userType: profile.user_type }));
        };
        const refresh = () => { refreshProfile().catch(() => {}); };
        window.addEventListener('focus', refresh);
        const timer = setInterval(refresh, 30000);
        return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', refresh); };
    }, [user?.id]);

    if (recovery) return <SetPassword />;

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-stone-900">
            <Sun className="animate-spin text-amber-500" size={40} />
        </div>
    );

    return !user
        ? <LoginScreen onLogin={setUser} />
        : <Dashboard
            key={`${user.id}:${user.userType}`}
            user={user}
            onLogout={async () => { await supabase.auth.signOut(); setUser(null); }}
          />;
}
