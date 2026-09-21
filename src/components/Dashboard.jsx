import { stageTransitionPatch } from '../stageRemarks.js';
// ─── Dashboard.jsx ────────────────────────────────────────────────────────────
// Main admin layout: sidebar + header + view router.
// Features:
//   • Trash sidebar item + soft-delete/recover/hard-delete
//   • Global search across ALL stages (name, phone, CRN) with results overlay
//   • Stage counts exclude deleted records
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { logActivity, useMetadata } from '../utils';
import { PRIMARY_STAGES } from '../constants';
import { permissionsFor } from '../access';
import { editablePatch, recordRequest } from '../records';

import OperationsView from './OperationsView';
import ExportView from './ExportView';
import DashboardView       from './DashboardView';
import FinancialView       from './FinancialView';
import SubsidyView         from './SubsidyView';
import CustomerCard        from './CustomerCard';
import CustomerDetailModal from './CustomerDetailModal';
import AddLeadModal        from './AddLeadModal';
import ActivityLogView     from './ActivityLogView';
import UserManagementView  from './UserManagementView';
import TrashView           from './TrashView';

import {
    LayoutDashboard, IndianRupee, Activity, UserCog, Menu, X, Settings2, CheckCircle2,
    Search, Plus, Download, LogOut, Sun, Trash2, Users, Banknote,
} from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Dashboard({ user, onLogout }) {
    const access = permissionsFor(user.userType);
    const [dataError, setDataError] = useState('');
    const [stageNotice, setStageNotice] = useState(null);
    const [customers, setCustomers]         = useState([]);
    const [loading, setLoading]             = useState(true);
    const [currentView, setCurrentView]     = useState('dashboard');
    const [selectedStage, setSelectedStage] = useState('Leads');
    const [financialProjectType, setFinancialProjectType] = useState('General');
    const [stageSearch, setStageSearch]     = useState('');    // per-stage search
    const [globalSearch, setGlobalSearch]   = useState('');    // global search
    const [globalResults, setGlobalResults] = useState([]);
    const [showGlobalDrop, setShowGlobalDrop] = useState(false);
    const [sidebarOpen, setSidebarOpen]     = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showAddLead, setShowAddLead]     = useState(false);
    const [selectedMonth, setSelectedMonth] = useState('All');
    const globalSearchRef                   = useRef(null);
    const meta = useMetadata();

    // ── Data fetching ──────────────────────────────────────────────────────────
    const fetchData = async (quiet = false) => {
        if (!quiet) setLoading(true);
        try {
            const data = await recordRequest('list');
            setCustomers(data || []);
            setDataError('');
        } catch (error) {
            setCustomers([]);
            setSelectedCustomer(null);
            setDataError(error.message);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const refresh = () => { if (!document.hidden) fetchData(true); };
        const timer = setInterval(refresh, 30000);
        window.addEventListener('focus', refresh);
        return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
    }, [user.userType]);

    // Close global search dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (globalSearchRef.current && !globalSearchRef.current.contains(e.target)) {
                setShowGlobalDrop(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Global search: across ALL non-deleted stages ───────────────────────────
    useEffect(() => {
        const q = globalSearch.trim().toLowerCase();
        if (!q) { setGlobalResults([]); setShowGlobalDrop(false); return; }
        const active = customers.filter(c => !c.deleted_at);
        const authorized = active;
        const results = authorized.filter(c =>
            c.customer_name?.toLowerCase().includes(q) ||
            String(c.phone_number || '').includes(globalSearch.trim()) ||
            c.crn?.toLowerCase().includes(q)
        ).slice(0, 8);
        setGlobalResults(results);
        setShowGlobalDrop(results.length > 0);
    }, [globalSearch, customers]);

    const handleGlobalSelect = (customer) => {
        // Navigate to the customer's stage so context is clear
        setCurrentView(access.crm ? 'stages' : 'financial');
        setSelectedStage(customer.stage || 'Leads');
        setStageSearch('');
        // Open the detail modal
        setSelectedCustomer(customer);
        setGlobalSearch('');
        setShowGlobalDrop(false);
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleUpdateCustomer = async (id, updates) => {
        try {
            const original = customers.find(c => c.id === id);
            const transition = updates.stage && updates.stage !== original?.stage ? stageTransitionPatch(original, updates.stage, PRIMARY_STAGES.find(s => s.id === original.stage)?.label || original.stage) : {};
            const patch = editablePatch(user.userType, { ...transition, ...updates }, original);
            if (!Object.keys(patch).length) return;
            const saved = await recordRequest('update', id, patch);
            setCustomers(prev => prev.map(c => c.id === id ? saved : c));
            setSelectedCustomer(prev => prev?.id === id ? saved : prev);
            if (patch.stage && saved.stage === patch.stage && saved.stage !== original?.stage) {
                setStageNotice({ name: saved.customer_name || original?.customer_name || 'Customer', stage: PRIMARY_STAGES.find(s => s.id === saved.stage)?.label || saved.stage });
            }
        } catch (error) {
            setDataError(error.message);
            throw error;
        }
    };

    const handleSoftDelete = async (id) => {
        await recordRequest('trash', id);
        setSelectedCustomer(null);
        await fetchData(true);
    };
    const handleRecover = async (id) => {
        await recordRequest('restore', id);
        await fetchData(true);
    };
    const handleHardDelete = async (id) => {
        await recordRequest('delete', id);
        setCustomers(prev => prev.filter(c => c.id !== id));
    };

    const handleMoveStage = async (id, newStage) => {
        const customer = customers.find(c => c.id === id);
        await handleUpdateCustomer(id, { stage: newStage });
        await logActivity(user.id, 'stage_change',
            `${customer?.customer_name}: Stage changed from ${customer?.stage || 'None'} to ${newStage}`, id);
    };

    const handleAddLead = async (data) => {
        await recordRequest('create', null, editablePatch(user.userType, data));
        logActivity(user.id, 'create', `Added new lead: ${data.customer_name}`, `Done by: ${user.name}`);
        setShowAddLead(false);
        fetchData();
    };

    // ── Derived data (active = non-deleted only) ───────────────────────────────
    const active      = customers.filter(c => !c.deleted_at);
    const trashed     = customers.filter(c => !!c.deleted_at);
    const isAuthorized = () => access.crm || access.finance;

    // Helper to get year from Customer: Checks crn for year ranges (e.g. 26-27 -> 2026, 27-28 -> 2027), falling back to date field or created_at
    const getYearFromCustomer = (c) => {
        const crn = String(c.crn || '');
        if (crn.includes('26-27')) return 2026;
        if (crn.includes('27-28')) return 2027;
        if (crn.includes('25-26')) return 2025;
        
        const dateStr = c.date || c.created_at;
        if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d.getFullYear();
        }
        return null;
    };

    // Apply Month filtering
    const filteredActive = active.filter(c => {
        if (selectedMonth === 'All') return true;
        const dateStr = c.date || c.created_at;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return !isNaN(date.getTime()) && date.getMonth() === Number(selectedMonth);
    });

    const stageCounts = PRIMARY_STAGES.reduce((acc, s) => {
        acc[s.id] = filteredActive.filter(c => c.stage === s.id && isAuthorized(c)).length;
        return acc;
    }, {});
    const generalFinCount = filteredActive.filter(c => c.financial_tag && !String(c.project_type || 'General').toLowerCase().includes('surya') && isAuthorized(c)).length;
    const pmSuryaFinCount = filteredActive.filter(c => c.financial_tag && String(c.project_type || '').toLowerCase().includes('surya') && isAuthorized(c)).length;
    const subsidyCount    = filteredActive.filter(c => {
        if (c.deleted_at) return false;
        return (Array.isArray(c.subsidy_history) && c.subsidy_history.length > 0) || c.subsidy_claim || c.subsidy_received;
    }).length;
    const trashCount      = trashed.length;

    // Per-stage filtered cards
    const filtered = filteredActive.filter(c => {
        const q = stageSearch.toLowerCase();
        const matchesSearch = !stageSearch ||
            c.customer_name?.toLowerCase().includes(q) ||
            String(c.phone_number || '').includes(stageSearch) ||
            c.crn?.toLowerCase().includes(q);
        return c.stage === selectedStage && matchesSearch && isAuthorized(c);
    });

    // ── Nav button helper ─────────────────────────────────────────────────────
    const NavBtn = ({ view, stage, icon: Icon, label, count, redBadge }) => {
        const isActive = view === 'stages'
            ? (currentView === 'stages' && selectedStage === stage)
            : currentView === view;
        return (
            <button
                onClick={() => {
                    if (view === 'stages') { setCurrentView('stages'); setSelectedStage(stage); }
                    else setCurrentView(view);
                    setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold mb-0.5 transition-colors ${isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">{label}</span>
                {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-semibold ${isActive ? 'bg-white/20 text-white' : redBadge ? 'bg-red-100 text-red-500' : 'bg-stone-100 text-stone-500'}`}>
                        {count}
                    </span>
                )}
            </button>
        );
    };

    // ── Role-based routing ────────────────────────────────────────────────────

    const headerTitle =
        currentView === 'export' ? 'Export Records'
        : currentView === 'dashboard' ? 'Business Dashboard'
        : currentView === 'financial' ? `Financial Tags (${financialProjectType === 'General' ? 'General' : 'PM SURYA'})`
        : currentView === 'subsidy'   ? 'Subsidy Overview'
        : currentView === 'operations' ? 'Operations'
        : currentView === 'activity'  ? 'Activity Log'
        : currentView === 'users'     ? 'User Management'
        : currentView === 'trash'     ? 'Trash'
        : PRIMARY_STAGES.find(s => s.id === selectedStage)?.label || selectedStage;

    return (
        <div className="min-h-screen bg-[#FCFBFA] flex">
            {stageNotice && <div className="fixed bottom-6 right-6 z-[100] max-w-md flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
                <div role="status" aria-live="polite" className="text-sm text-stone-700">
                    <p className="font-semibold text-emerald-700 mb-1">Customer moved successfully</p>
                    <p>{stageNotice.name} moved to <strong>{stageNotice.stage}</strong>.</p>
                </div>
                <button type="button" onClick={() => setStageNotice(null)} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100">Got it</button>
            </div>}
            {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* ── Sidebar ── */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone-100 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 border-b border-stone-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                            <Sun size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-stone-800">POWERTRONICS</h1>
                            <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide">Portal</p>
                        </div>
                    </div>
                    <button className="lg:hidden text-stone-400" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    <NavBtn view="dashboard" icon={LayoutDashboard} label="Dashboard" count={0} />
                    <NavBtn view="export" icon={Download} label="Export Records" count={0} />

                    {/* Financial */}
                    {access.finance && <div className="mt-4 mb-1">
                        <div className="text-xs uppercase font-semibold text-stone-300 px-3 pb-2 tracking-wide">Financial</div>
                        
                        {/* General Tab */}
                        <button onClick={() => { setCurrentView('financial'); setFinancialProjectType('General'); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold mb-1 transition-colors ${currentView === 'financial' && financialProjectType === 'General' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                            <IndianRupee className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left">General</span>
                            {generalFinCount > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-semibold ${currentView === 'financial' && financialProjectType === 'General' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
                                    {generalFinCount}
                                </span>
                            )}
                        </button>

                        {/* PM Surya Tab */}
                        <button onClick={() => { setCurrentView('financial'); setFinancialProjectType('PM SURYA'); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold mb-1 transition-colors ${currentView === 'financial' && financialProjectType === 'PM SURYA' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                            <IndianRupee className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left">PM SURYA</span>
                            {pmSuryaFinCount > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-semibold ${currentView === 'financial' && financialProjectType === 'PM SURYA' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
                                    {pmSuryaFinCount}
                                </span>
                            )}
                        </button>

                        {/* Subsidy Tab */}
                        <button onClick={() => { setCurrentView('subsidy'); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold mb-1 transition-colors ${currentView === 'subsidy' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                            <Banknote className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left">Subsidy</span>
                            {subsidyCount > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-semibold ${currentView === 'subsidy' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {subsidyCount}
                                </span>
                            )}
                        </button>
                    </div>}

                    {/* Project Stages */}
                    {access.crm && <>
                    <div className="text-xs uppercase font-semibold text-stone-300 px-3 pt-4 pb-2 tracking-wide">Project Stages</div>
                    {PRIMARY_STAGES.map(s => (
                        <NavBtn key={s.id} view="stages" stage={s.id} icon={s.icon} label={s.label} count={stageCounts[s.id] || 0} />
                    ))}

                    </>}
                    {access.admin && <>
                    {/* System */}
                    <div className="text-xs uppercase font-semibold text-stone-300 px-3 pt-5 pb-2 tracking-wide">System</div>
                    <NavBtn view="activity" icon={Activity}  label="Activity Log"      count={0} />
                    <NavBtn view="operations" icon={Settings2} label="Operations" count={0} />
                    {user.userType === 'admin' && (
                        <NavBtn view="users" icon={UserCog} label="User Management" count={0} />
                    )}
                    <NavBtn view="trash" icon={Trash2} label="Trash" count={trashCount} redBadge />
                    </>}
                </div>

                {/* User + Logout */}
                <div className="p-3 border-t border-stone-100">
                    <div className="flex items-center gap-3 px-3 py-2 mb-1">
                        <div className="w-8 h-8 bg-stone-900 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'A'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-stone-700 truncate">{user.name}</p>
                            <p className="text-xs text-stone-400">{user.role}</p>
                        </div>
                    </div>
                    <button onClick={onLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </aside>

            {/* ── Main ── */}
            <main className="flex-1 min-w-0 lg:ml-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white/90 backdrop-blur-md border-b border-stone-100 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-stone-500"><Menu className="w-6 h-6" /></button>
                        <h2 className="font-semibold text-stone-800">{headerTitle}</h2>
                        {currentView === 'financial' && (financialProjectType === 'General' ? generalFinCount : pmSuryaFinCount) > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                                {financialProjectType === 'General' ? generalFinCount : pmSuryaFinCount} tagged
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Month Selector directly in main header */}
                        <select
                            aria-label="Filter by month"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-xs font-semibold px-3 py-2 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all cursor-pointer"
                        >
                            <option value="All">All Months</option>
                            {MONTHS.map((m, idx) => (
                                <option key={idx} value={idx}>{m}</option>
                            ))}
                        </select>
                        {selectedMonth !== 'All' && (
                            <button
                                type="button"
                                onClick={() => setSelectedMonth('All')}
                                aria-label="Clear month filter"
                                className="shrink-0 px-3 py-2 rounded-xl border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                            >
                                Clear
                            </button>
                        )}


                        {/* ── Global search (always visible) ── */}
                        <div className="relative" ref={globalSearchRef}>
                            <Search className="absolute left-3 top-2.5 text-stone-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search all stages..."
                                value={globalSearch}
                                onChange={e => setGlobalSearch(e.target.value)}
                                onFocus={() => globalResults.length > 0 && setShowGlobalDrop(true)}
                                className="pl-9 pr-4 py-2 bg-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 w-40 lg:w-60"
                            />
                            {/* Results dropdown */}
                            {showGlobalDrop && (
                                <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-2xl shadow-xl border border-stone-100 py-1 z-50 overflow-hidden">
                                    {globalResults.map(c => (
                                        <button key={c.id} onClick={() => handleGlobalSelect(c)}
                                            className="w-full px-4 py-2.5 text-left hover:bg-amber-50 transition-colors group">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold text-stone-800 group-hover:text-amber-700">{c.customer_name}</p>
                                                <span className="text-xs bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded font-semibold uppercase ml-2">{c.crn || '–'}</span>
                                            </div>
                                            <p className="text-xs text-stone-400 mt-0.5">
                                                {PRIMARY_STAGES.find(s => s.id === c.stage)?.label || c.stage} · {c.phone_number || 'No phone'}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Per-stage search (only in stages view) */}
                        {currentView === 'stages' && access.crm && (
                            <div className="relative hidden lg:block">
                                <Search className="absolute left-3 top-2.5 text-stone-400 w-4 h-4" />
                                <input type="text" placeholder="Filter this stage..." value={stageSearch}
                                    onChange={e => setStageSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 w-40" />
                            </div>
                        )}

                        {(access.crm || access.finance) && (
                            <>
                                <button onClick={() => setCurrentView('export')}
                                    title="Choose sheets and preview your Excel export"
                                    className="flex items-center gap-1.5 border border-stone-200 text-stone-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-wait">
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline text-xs">Export</span>
                                </button>
                                {access.crm && <button onClick={() => setShowAddLead(true)}
                                    className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors">
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline text-xs">Add Lead</span>
                                </button>}
                            </>
                        )}
                    </div>
                </header>

                {/* View router */}
                <div className="flex-1 p-4 lg:p-6">
                    {dataError && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{dataError}<button onClick={() => fetchData()} className="ml-3 underline">Retry</button></div>}

                    {currentView === 'export' && <ExportView key={user.userType} records={active} filteredRecords={filteredActive} userType={user.userType} monthLabel={selectedMonth === 'All' ? 'All months' : MONTHS[Number(selectedMonth)]} disabled={loading || !!dataError} />}
                    {currentView === 'dashboard' && <DashboardView customers={filteredActive} loading={loading} access={access} />}
                    {currentView === 'financial' && access.finance && <FinancialView meta={meta} customers={filteredActive} onSelectCustomer={setSelectedCustomer} projectType={financialProjectType} />}
                    {currentView === 'subsidy' && access.finance && <SubsidyView customers={filteredActive} onSelectCustomer={setSelectedCustomer} />}
                    {currentView === 'activity' && access.admin && <ActivityLogView />}
                    {currentView === 'operations' && access.admin && <OperationsView user={user} />}
                    {currentView === 'users' && user.userType === 'admin' && <UserManagementView currentUser={user} />}

                    {/* Trash view */}
                    {currentView === 'trash' && access.admin && (
                        <TrashView
                            trashedCustomers={trashed}
                            onRecover={handleRecover}
                            onHardDelete={handleHardDelete}
                            isAdmin={user.userType === 'admin'}
                        />
                    )}

                    {/* Stage grid */}
                    {currentView === 'stages' && access.crm && (
                        loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="w-8 h-8 border-4 border-stone-900 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filtered.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                {filtered.map(c => (
                                    <CustomerCard canSeeFinance={access.finance} key={c.id} customer={c} onSelect={setSelectedCustomer} onMoveStage={handleMoveStage} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
                                <Users className="w-12 h-12 mb-3 text-stone-200" />
                                <p className="font-medium text-stone-500">{stageSearch ? 'No matching results in this stage' : 'No customers in this stage'}</p>
                                <p className="text-sm mt-1">{stageSearch ? 'Try the global search bar to find across all stages' : 'Move customers here or add a new lead'}</p>
                            </div>
                        )
                    )}
                </div>
            </main>

            {/* Modals */}
            {selectedCustomer && (
                <CustomerDetailModal
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    onUpdate={handleUpdateCustomer}
                    onDelete={handleSoftDelete}
                    user={user}
                    meta={meta}
                />
            )}
            {showAddLead && access.crm && <AddLeadModal canSeeFinance={access.finance} onClose={() => setShowAddLead(false)} onSave={handleAddLead} meta={meta} />}
        </div>
    );
}
