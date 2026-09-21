import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { supabase } from '../supabase';
import { logActivity } from '../utils';
import { DROPDOWN_LABELS, groupDropdowns } from '../dropdowns.js';

export default function OperationsView({ user }) {
    const [rows, setRows] = useState([]);
    const [category, setCategory] = useState('panel');
    const [value, setValue] = useState('');
    const [search, setSearch] = useState('');
    const [removing, setRemoving] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const lock = useRef(false);
    const load = async () => {
        const { data, error } = await supabase.from('metadata').select('category,label').order('label');
        if (error) throw error;
        setRows(data || []);
    };
    useEffect(() => { if (user.userType === 'admin') load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, [user.userType]);
    if (user.userType !== 'admin') return null;
    const meta = groupDropdowns(rows);
    const options = meta[category].filter(label => label.toLowerCase().includes(search.toLowerCase()));
    const mutate = async (remove = false) => {
        if (lock.current || !meta._ready) return;
        const label = remove ? removing : value.trim();
        if (!label) return;
        if (!remove && meta[category].some(item => item.toLowerCase() === label.toLowerCase())) { setError('This option already exists.'); return; }
        lock.current = true; setBusy(true); setError(''); setMessage('');
        try {
            let request = supabase.from('metadata');
            request = remove ? request.delete().eq('category', category).eq('label', label) : request.insert({ category, label });
            const { data, error } = await request.select('category,label');
            if (error) throw error;
            if (!data?.length) throw new Error('The change was not saved. Check your admin permissions and refresh.');
            setRows(previous => remove ? previous.filter(row => !(row.category === category && row.label === label)) : [...previous, ...data]);
            setValue(''); setRemoving(null);
            setMessage(`${label} ${remove ? 'removed from choices' : 'added'}.`);
            window.dispatchEvent(new Event('metadata-updated'));
            await logActivity(user.id, 'metadata', `${remove ? 'Removed' : 'Added'} ${DROPDOWN_LABELS[category]} option: ${label}`);
        } catch (e) { setError(e.message || 'Could not save. Please try again.'); }
        finally { lock.current = false; setBusy(false); }
    };
    return <div className="max-w-5xl mx-auto space-y-5">
        <div><h3 className="text-xl font-semibold text-stone-800">Dropdown options</h3><p className="mt-1 text-sm text-stone-500">Manage the choices your team uses. Removing an option keeps existing customer records unchanged.</p></div>
        {loading ? <p role="status">Loading options…</p> : <>
        {!meta._ready && <div role="alert" className="p-4 rounded-2xl bg-amber-50 text-sm text-amber-900">Setup required: run the Operations dropdown SQL patch in Supabase, then refresh this page. Changes are disabled until setup is complete.</div>}
        <div className="grid md:grid-cols-[230px_1fr] gap-5">
            <nav aria-label="Dropdown categories" className="space-y-1">{Object.entries(DROPDOWN_LABELS).map(([key,label]) => <button key={key} disabled={busy} onClick={() => {setCategory(key);setSearch('');setValue('');setRemoving(null);setError('');setMessage('');}} className={`w-full text-left px-4 py-3 rounded-xl text-sm ${category === key ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>{label}<span className="float-right opacity-60">{meta[key].length}</span></button>)}</nav>
            <section className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                <h4 className="font-semibold text-stone-800">{DROPDOWN_LABELS[category]}</h4>
                <form onSubmit={e => {e.preventDefault();mutate();}} className="flex gap-2">
                    <input aria-label="New option" maxLength={120} disabled={busy || !meta._ready} value={value} onChange={e => setValue(e.target.value)} placeholder="Add a new option…" className="min-w-0 flex-1 border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
                    <button disabled={busy || !meta._ready || !value.trim()} className="flex items-center gap-1.5 px-4 rounded-xl bg-stone-900 text-white text-sm disabled:opacity-40"><Plus size={16}/>Add</button>
                </form>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
                <div className="relative"><Search size={16} className="absolute left-3 top-3 text-stone-400"/><input aria-label="Search options" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find an option…" className="w-full bg-stone-50 rounded-xl pl-9 pr-3 py-2.5 text-sm"/></div>
                <ul className="divide-y divide-stone-100">{options.map(label => <li key={label} className="py-3 flex items-center justify-between gap-3 text-sm"><span className="break-words">{label}</span><button aria-label={`Remove ${label}`} disabled={busy || !meta._ready} onClick={() => {setRemoving(label);setError('');}} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30"><Trash2 size={16}/></button></li>)}</ul>
                {!options.length && <p className="text-sm text-stone-500">No options found.</p>}
                {removing && <div role="alertdialog" aria-label="Remove option" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p>Remove <strong>{removing}</strong> from this dropdown?</p><p className="mt-1 text-stone-600">Existing records will keep their saved value.</p><div className="flex gap-2 mt-3"><button disabled={busy} onClick={() => setRemoving(null)} className="px-3 py-2 rounded-lg border border-stone-300">Cancel</button><button disabled={busy} onClick={() => mutate(true)} className="px-3 py-2 rounded-lg bg-red-600 text-white">{busy ? 'Saving…' : 'Remove option'}</button></div></div>}
            </section>
        </div></>}
    </div>;
}
