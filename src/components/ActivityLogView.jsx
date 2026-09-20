import ActivityHistory from './ActivityHistory.jsx';
// ─── ActivityLogView.jsx ──────────────────────────────────────────────────────
// Full-page activity log with real-time Supabase subscription.
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function ActivityLogView() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            const { data, error } = await supabase
                .from('activity_log')
                .select('*, profiles(name)')
                .order('created_at', { ascending: false })
                .limit(200);
            if (!error) { setLogs(data || []); setErrorMessage(''); }
            else setErrorMessage('Could not load activity. Refresh to try again.');
            setLoading(false);
        };
        fetchLogs();
        const channel = supabase.channel('activity_log_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, fetchLogs)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-stone-900 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return <div className="max-w-5xl mx-auto">
        {errorMessage ? <p role="alert" className="text-sm text-red-700">{errorMessage}</p> : <ActivityHistory logs={logs} limit={200} />}
    </div>;
}
