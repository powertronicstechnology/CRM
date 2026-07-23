// ─── DashboardView.jsx ────────────────────────────────────────────────────────
// Metrics overview: project counts, financial summary, stage pipeline bar chart.
// • "Total" = all non-deleted records
// • "Live"  = non-deleted AND stage !== 'Completed'
// • "Completed" = stage === 'Completed' (non-deleted)
// Numbers use Indian locale (₹1,00,000)
// ──────────────────────────────────────────────────────────────────────────────

import { FolderOpen, Activity, CheckCircle2 } from 'lucide-react';
import { PRIMARY_STAGES } from '../constants';

function fmtLakh(val) {
    const n = Number(val) || 0;
    if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)} Cr`;
    if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(2)} L`;
    return `₹${n.toLocaleString('en-IN')}`;
}

const MetricBox = ({ label, value, sub, icon: Icon, color }) => {
    const colorMap = {
        amber:   'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue:    'bg-blue-50 text-blue-600',
    };
    return (
        <div className="bg-white p-6 rounded-[28px] border border-stone-100 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
                <Icon size={16} />
            </div>
            <p className="text-2xl font-bold text-stone-800 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">{label}</p>
        </div>
    );
};

export default function DashboardView({ customers = [], loading }) {
    if (loading) return (
        <div className="p-20 text-center text-stone-400 font-medium italic animate-pulse">
            Calculating solar metrics...
        </div>
    );

    // Exclude soft-deleted records from all metrics
    const active = customers.filter(c => !c.deleted_at);

    const totalProjects   = active.length;
    const completedCount  = active.filter(c => c.stage === 'Completed').length;
    const liveProjects    = active.filter(c => c.stage !== 'Completed').length;

    const totalQuoted    = active.reduce((s, c) => s + (Number(c.quoted_amount)   || 0), 0);
    const totalReceived  = active.reduce((s, c) => s + (Number(c.total_received)  || 0), 0);
    const totalDues      = active.reduce((s, c) => s + (Number(c.receivables)     || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Project counts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricBox label="Total Database" value={totalProjects}  icon={FolderOpen}   color="blue"    sub={`${active.length} active records`} />
                <MetricBox label="Live Projects"  value={liveProjects}   icon={Activity}     color="amber"   sub="Excluding Completed" />
                <MetricBox label="Completed"      value={completedCount} icon={CheckCircle2} color="emerald" sub="Fully commissioned" />
            </div>

            {/* Financial summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[28px] border border-stone-100 shadow-sm">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Sales (Quoted)</p>
                    <p className="text-2xl font-bold text-stone-800">{fmtLakh(totalQuoted)}</p>
                    <p className="text-xs text-stone-400 mt-1">₹{totalQuoted.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white p-6 rounded-[28px] border border-stone-100 shadow-sm">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Cash Collected</p>
                    <p className="text-2xl font-bold text-emerald-600">{fmtLakh(totalReceived)}</p>
                    <p className="text-xs text-stone-400 mt-1">₹{totalReceived.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-white p-6 rounded-[28px] border border-stone-100 shadow-sm border-b-4 border-b-orange-400">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Outstanding Dues</p>
                    <p className="text-2xl font-bold text-orange-600">{fmtLakh(totalDues)}</p>
                    <p className="text-xs text-stone-400 mt-1">₹{totalDues.toLocaleString('en-IN')}</p>
                </div>
            </div>

            {/* Stage pipeline bar chart */}
            <div className="bg-white rounded-[32px] p-8 border border-stone-100 shadow-sm">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-8">Operational Density (Stage Breakdown)</h3>
                <div className="space-y-5">
                    {PRIMARY_STAGES.map(stage => {
                        const count = active.filter(c => c.stage === stage.id).length;
                        const perc  = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
                        return (
                            <div key={stage.id} className="group">
                                <div className="flex justify-between text-[10px] font-bold text-stone-600 mb-1.5 uppercase tracking-tight">
                                    <span className="group-hover:text-amber-600 transition-colors">{stage.label}</span>
                                    <span className="text-stone-400">{count}</span>
                                </div>
                                <div className="h-1.5 bg-stone-50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 rounded-full ${stage.id === 'Completed' ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                        style={{ width: `${perc}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
