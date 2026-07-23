```javascriptreact
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import SalesView from './components/salesview';
import AgentForm from './components/agentform';
import DashboardView from './DashboardView';
import {
    Users, ShoppingCart, Clock, Package, Wrench, FileText, Send, Gauge,
    CheckCircle2, Plus, ChevronDown, X, MapPin, Zap, LogOut, Search,
    LayoutDashboard, Menu, Trash2, Edit3, Sparkles, Save, MessageSquare,
    Banknote, CreditCard, ClipboardCheck, Phone, Mail, User, IndianRupee,
    Building2, Activity, FolderOpen, CheckSquare, AlertTriangle
} from 'lucide-react';

// ─── Stage definitions ────────────────────────────────────────────────────────
const STAGES = [
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'pending_loans', label: 'Pending Loans', icon: Clock },
    { id: 'material_procurement', label: 'Material Procurement', icon: Package },
    { id: 'installation', label: 'Installation', icon: Wrench },
    { id: 'post_installation_docs', label: 'Post-Installation Docs', icon: FileText },
    { id: 'pending_discom', label: 'Pending DISCOM Submissions', icon: Send },
    { id: 'meter_installation', label: 'Meter Installation', icon: Gauge },
    { id: 'system_commissioning', label: 'System Commissioning', icon: Zap },
    { id: 'meter_flag', label: 'Meter Flag', icon: MapPin },
    { id: 'discom_inspection', label: 'DISCOM Inspection', icon: ClipboardCheck },
    { id: 'subsidy_redeems', label: 'Subsidy Redeems Pending', icon: Banknote },
    { id: 'subsidy_disbursement', label: 'Subsidy Disbursement Pending', icon: Banknote },
    { id: 'second_payment', label: '2nd Payment', icon: CreditCard },
    { id: 'third_payment', label: '3rd Payment', icon: CreditCard },
    { id: 'completed', label: 'Projects Completed', icon: CheckCircle2 },
    { id: 'pending_cheque', label: 'Pending Cheque', icon: Clock },
    { id: 'received_cheque', label: 'Received Cheque', icon: CheckCircle2 },
];

const DEFAULT_PROJECT_CHECKLIST = [
    { id: 'kyc_docs', label: 'KYC Docs and Docs from PM Suryaghar Mufti Bijili Yojana portal and Digital approval from Janasamarth site', section: 'Pre-Installation', checked: false },
    { id: 'docs_sent_bank', label: 'Docs sent to the bank', section: 'Pre-Installation', checked: false },
    { id: 'serial_numbers', label: 'Serial numbers received', section: 'Post Installation Documentation', checked: false },
    { id: 'agreement_article7', label: 'Agreement on Article-7 100rs stamp', section: 'Post Installation Documentation', checked: false },
    { id: 'signed_agreement', label: 'Signed Agreement', section: 'Post Installation Documentation', checked: false },
    { id: 'self_declaration', label: 'Self Declaration', section: 'Post Installation Documentation', checked: false },
    { id: 'work_completion_portal', label: 'Work Completion from PM Surya Ghar portal', section: 'Post Installation Documentation', checked: false },
    { id: 'geo_tag_photos', label: 'Geo-Tag Photos of the site', section: 'Post Installation Documentation', checked: false },
    { id: 'dcr_certificate', label: 'DCR Certificate', section: 'Post Installation Documentation', checked: false },
    { id: 'panel_inverter_warranty', label: 'Panel and Inverter Warranty', section: 'Post Installation Documentation', checked: false },
    { id: 'undertaking_declaration', label: 'Undertaking/Self-Declaration', section: 'Post Installation Documentation', checked: false },
    { id: 'work_completion_report', label: 'Work Completion report', section: 'Post Installation Documentation', checked: false },
    { id: 'net_metering_request', label: 'Net-Metering service request from DISCOM website', section: 'Post Installation Documentation', checked: false },
    { id: 'discom_charges_slip', label: 'Pay Estimated and Demand charges slip from DISCOM website', section: 'Post Installation Documentation', checked: false },
    { id: 'application_form_annexure', label: 'Application Form [Annexure-1 / Net-Meter Application Form]', section: 'Post Installation Documentation', checked: false },
    { id: 'submit_docs_discom', label: 'Submitting the documents at DISCOM', section: 'Post Net-Meter Application', checked: false },
    { id: 'net_meter_installation', label: 'Net-Meter Installation', section: 'Post Net-Meter Application', checked: false },
    { id: 'discom_inspection', label: 'DISCOM Inspection & Project Commissioning', section: 'Post Net-Meter Application', checked: false },
    { id: 'subsidy_redeem', label: "Subsidy Redeem from the Customer's login", section: 'Post Net-Meter Application', checked: false },
    { id: 'subsidy_disbursed', label: 'Subsidy Disbursed', section: 'Post Net-Meter Application', checked: false },
    { id: 'all_payments_cleared', label: 'All payments cleared', section: 'Post Net-Meter Application', checked: false },
    { id: 'warranty_service_card', label: 'Warranty and service card', section: 'Post Net-Meter Application', checked: false },
];

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;
            const { data: profile, error: profileError } = await supabase
                .from('profiles').select('*').eq('id', authData.user.id).single();
            if (profileError || !profile) {
                await supabase.auth.signOut();
                throw new Error('Profile not found. Contact Admin.');
            }
            onLogin({ id: authData.user.id, email: authData.user.email, name: profile.name, role: profile.role, userType: profile.user_type });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Ray2Volt Solar</h1>
                    <p className="text-gray-500 text-sm mt-1">CRM Login</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-10 p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" required />
                    </div>
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" required />
                    </div>
                    {error && <p className="text-red-500 text-xs text-center bg-red-50 p-2 rounded-lg">{error}</p>}
                    <button disabled={loading} className="w-full bg-gray-900 text-white p-3 rounded-xl font-bold hover:bg-gray-800 transition-all flex justify-center items-center gap-2 text-sm">
                        {loading ? 'Verifying...' : <><Sparkles size={16} /> Sign In</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Detail Item ──────────────────────────────────────────────────────────────
function DetailItem({ label, value, isMoney = false, isEnergy = false }) {
    return (
        <div className="bg-gray-50 p-3 rounded-xl">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-sm font-medium truncate ${isMoney ? 'text-emerald-600' : isEnergy ? 'text-blue-600' : 'text-gray-800'}`}>
                {value || '–'}
            </p>
        </div>
    );
}

// ─── Customer Detail Modal ────────────────────────────────────────────────────
function CustomerDetailModal({ customer, onClose, onUpdate, onDelete, user }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ ...customer });
    const [followUpText, setFollowUpText] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingChecklistItem, setPendingChecklistItem] = useState(null);
    const isAdmin = user?.userType === 'admin';

    const checklist = Array.isArray(customer.project_checklist) && customer.project_checklist.length > 0
        ? customer.project_checklist
        : DEFAULT_PROJECT_CHECKLIST;

    const sections = [...new Set(checklist.map(item => item.section))];

    const handleSave = async () => {
        setSaving(true);
        const updates = { ...editData };
        delete updates.id;
        delete updates.created_at;
        await onUpdate(customer.id, updates);
        setIsEditing(false);
        setSaving(false);
    };

    const handleAddFollowUp = async () => {
        if (!followUpText.trim()) return;
        const newFollowUp = { id: Date.now().toString(), text: followUpText, date: new Date().toISOString(), authorName: user.name };
        const updatedFollowUps = [...(customer.follow_ups || []), newFollowUp];
        await onUpdate(customer.id, { follow_ups: updatedFollowUps });
        setFollowUpText('');
    };

    const handleChecklistToggle = async (itemId, currentChecked) => {
        const updatedChecklist = checklist.map(item =>
            item.id === itemId
                ? { ...item, checked: !currentChecked, checkedAt: !currentChecked ? new Date().toISOString() : null, checkedBy: !currentChecked ? user.name : null }
                : item
        );
        await onUpdate(customer.id, { project_checklist: updatedChecklist });
        setPendingChecklistItem(null);
    };

    const handleDelete = async () => {
        setDeleting(true);
        await onDelete(customer.id);
        setDeleting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-gray-900 px-5 py-4 flex justify-between items-start flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white">{customer.customer_name}</h2>
                        <p className="text-gray-400 text-xs mt-0.5">{customer.quotation_number || customer.project_id || 'No ID'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {isAdmin && (
                            <>
                                <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-white/60 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-2 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* Stage selector */}
                    <div className="bg-gray-50 p-3 rounded-xl">
                        <label className="text-xs text-gray-500 font-medium mb-2 block">Current Stage</label>
                        <select
                            value={editData.stage || ''}
                            onChange={async (e) => {
                                const newStage = e.target.value;
                                setEditData(prev => ({ ...prev, stage: newStage }));
                                if (!isEditing) await onUpdate(customer.id, { stage: newStage });
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                        >
                            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                    </div>

                    {/* Customer Info */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Customer Info</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <DetailItem label="Phone" value={customer.phone} />
                            <DetailItem label="Email" value={customer.email} />
                            <DetailItem label="Location" value={customer.location} />
                            <DetailItem label="Branch" value={customer.branch} />
                            <DetailItem label="Aadhar" value={customer.aadhar_number} />
                            <DetailItem label="POC" value={customer.poc_name} />
                        </div>
                    </div>

                    {/* Project Info */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-blue-500" /> Project</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <DetailItem label="Capacity" value={customer.capacity ? `${customer.capacity} kWp` : null} isEnergy />
                            <DetailItem label="Project Type" value={customer.project_type} />
                            <DetailItem label="Vendor" value={customer.vendor} />
                            <DetailItem label="Application #" value={customer.application_number} />
                        </div>
                    </div>

                    {/* Financial */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5 text-emerald-600" /> Financial</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <DetailItem label="Quoted Amount" value={customer.quoted_amount ? `₹${Number(customer.quoted_amount).toLocaleString('en-IN')}` : null} isMoney />
                            <DetailItem label="Bank Quote" value={customer.quote_to_bank ? `₹${Number(customer.quote_to_bank).toLocaleString('en-IN')}` : null} isMoney />
                            <DetailItem label="Payment Type" value={customer.cash_or_loan || customer.payment_type} />
                            <DetailItem label="Quoted Price" value={customer.quoted_price ? `₹${Number(customer.quoted_price).toLocaleString('en-IN')}` : null} isMoney />
                            <DetailItem label="Receivables" value={customer.receivables ? `₹${Number(customer.receivables).toLocaleString('en-IN')}` : null} isMoney />
                            <DetailItem label="Discount" value={customer.discount ? `₹${Number(customer.discount).toLocaleString('en-IN')}` : null} />
                        </div>
                    </div>

                    {/* Payments */}
                    {(customer.payment_1 || customer.payment_2 || customer.payment_3) && (
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Payments</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {customer.payment_1 && <DetailItem label="Payment 1" value={`₹${Number(customer.payment_1).toLocaleString('en-IN')} • ${customer.payment_1_date || ''}`} isMoney />}
                                {customer.payment_2 && <DetailItem label="Payment 2" value={`₹${Number(customer.payment_2).toLocaleString('en-IN')} • ${customer.payment_2_date || ''}`} isMoney />}
                                {customer.payment_3 && <DetailItem label="Payment 3" value={`₹${Number(customer.payment_3).toLocaleString('en-IN')} • ${customer.payment_3_date || ''}`} isMoney />}
                                {customer.payment_4 && <DetailItem label="Payment 4" value={`₹${Number(customer.payment_4).toLocaleString('en-IN')} • ${customer.payment_4_date || ''}`} isMoney />}
                                {customer.payment_5 && <DetailItem label="Payment 5" value={`₹${Number(customer.payment_5).toLocaleString('en-IN')} • ${customer.payment_5_date || ''}`} isMoney />}
                            </div>
                        </div>
                    )}

                    {/* Bank Details */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Bank Details</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <DetailItem label="Bank Name" value={customer.bank_name} />
                            <DetailItem label="Branch" value={customer.branch_name} />
                            <DetailItem label="Account #" value={customer.bank_account_number} />
                            <DetailItem label="IFSC" value={customer.ifsc_code || customer.disbursal_ifsc_code} />
                            <DetailItem label="Loan Application #" value={customer.loan_application_number} />
                        </div>
                    </div>

                    {/* Technical / DISCOM */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Technical</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <DetailItem label="Meter Category" value={customer.meter_category} />
                            <DetailItem label="EB Number" value={customer.eb_number} />
                            <DetailItem label="DTR Code" value={customer.dtr_code} />
                            <DetailItem label="Sanctioned Load" value={customer.sanctioned_load} />
                            <DetailItem label="DISCOM Division" value={customer.discom_division} />
                            <DetailItem label="Net Metering" value={customer.net_metering} />
                        </div>
                    </div>

                    {/* Post Installation */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Post Installation</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <DetailItem label="System Commissioning" value={customer.system_commissioning} />
                            <DetailItem label="Net Meter Install Date" value={customer.net_meter_install_date} />
                            <DetailItem label="Subsidy" value={customer.subsidy} />
                            <DetailItem label="Subsidy Disbursement" value={customer.subsidy_disbursement_date} />
                            <DetailItem label="Subsidy Return Remark" value={customer.subsidy_return_remark} />
                            <DetailItem label="Impression" value={customer.impression} />
                        </div>
                        {customer.installation_remarks && (
                            <div className="mt-2 bg-gray-50 p-3 rounded-xl">
                                <p className="text-[10px] text-gray-400 uppercase mb-1">Installation Remarks</p>
                                <p className="text-sm text-gray-700">{customer.installation_remarks}</p>
                            </div>
                        )}
                        {customer.post_installation_remarks && (
                            <div className="mt-2 bg-gray-50 p-3 rounded-xl">
                                <p className="text-[10px] text-gray-400 uppercase mb-1">Post Installation Remarks</p>
                                <p className="text-sm text-gray-700">{customer.post_installation_remarks}</p>
                            </div>
                        )}
                    </div>

                    {/* Links */}
                    <div className="flex flex-wrap gap-3">
                        {customer.location_link && (
                            <a href={customer.location_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm">
                                <MapPin className="w-4 h-4" /> View on Maps
                            </a>
                        )}
                        {(customer.docs_link || customer.google_drive_link) && (
                            <a href={customer.docs_link || customer.google_drive_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm">
                                <FolderOpen className="w-4 h-4" /> Customer Documents
                            </a>
                        )}
                    </div>

                    {/* Remarks */}
                    {(customer.site_remarks || customer.remarks || customer.remarks_on_sanctioned_load) && (
                        <div className="space-y-2">
                            {customer.site_remarks && <div className="bg-gray-50 p-3 rounded-xl"><p className="text-[10px] text-gray-400 uppercase mb-1">Site Remarks</p><p className="text-sm text-gray-700">{customer.site_remarks}</p></div>}
                            {customer.remarks && <div className="bg-gray-50 p-3 rounded-xl"><p className="text-[10px] text-gray-400 uppercase mb-1">Remarks</p><p className="text-sm text-gray-700">{customer.remarks}</p></div>}
                            {customer.remarks_on_sanctioned_load && <div className="bg-gray-50 p-3 rounded-xl"><p className="text-[10px] text-gray-400 uppercase mb-1">Sanctioned Load Remarks</p><p className="text-sm text-gray-700">{customer.remarks_on_sanctioned_load}</p></div>}
                        </div>
                    )}

                    {/* Project Checklist */}
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-emerald-600" /> Project Management Checklist</h3>
                        <div className="space-y-4">
                            {sections.map(section => {
                                const sectionItems = checklist.filter(item => item.section === section);
                                const completedCount = sectionItems.filter(item => item.checked).length;
                                const progress = Math.round((completedCount / sectionItems.length) * 100);
                                return (
                                    <div key={section} className="bg-gray-50 rounded-xl p-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{section}</h4>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${progress === 100 ? 'bg-emerald-100 text-emerald-700' : progress > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-500'}`}>
                                                {completedCount}/{sectionItems.length}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                                            <div className={`h-1.5 rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-yellow-400'}`} style={{ width: `${progress}%` }} />
                                        </div>
                                        <div className="space-y-2">
                                            {sectionItems.map(item => (
                                                <label key={item.id} className={`flex items-start gap-2 ${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={item.checked}
                                                        onChange={() => isAdmin && setPendingChecklistItem(item)}
                                                        disabled={!isAdmin}
                                                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span className={`text-sm leading-tight ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Follow Ups / Activity */}
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-gray-500" /> Activity Log</h3>
                        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                            {(customer.follow_ups || []).length > 0 ? (
                                [...(customer.follow_ups || [])].reverse().map((f, i) => (
                                    <div key={i} className="bg-gray-50 p-3 rounded-xl">
                                        <p className="text-sm text-gray-800">{f.text}</p>
                                        <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                                            <span>{f.authorName}</span>
                                            <span>{new Date(f.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm text-center py-4">No activity yet</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={followUpText}
                                onChange={e => setFollowUpText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddFollowUp()}
                                placeholder="Add a note..."
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                            />
                            <button onClick={handleAddFollowUp} disabled={!followUpText.trim()} className="px-3 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors">
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Save button when editing */}
                {isEditing && (
                    <div className="border-t p-4 flex-shrink-0">
                        <button onClick={handleSave} disabled={saving} className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50">
                            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                        </button>
                    </div>
                )}
            </div>

            {/* Delete confirm */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
                            <h3 className="font-bold text-gray-800">Delete Customer?</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-5">Are you sure you want to delete <strong>{customer.customer_name}</strong>? This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                                {deleting ? 'Deleting...' : <><Trash2 className="w-4 h-4" /> Delete</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Checklist confirm */}
            {pendingChecklistItem && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-bold text-gray-800 mb-2">
                            {pendingChecklistItem.checked ? 'Mark as Incomplete?' : 'Mark as Complete?'}
                        </h3>
                        <p className="text-sm text-gray-600 mb-5 bg-gray-50 p-3 rounded-xl">{pendingChecklistItem.label}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setPendingChecklistItem(null)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm">Cancel</button>
                            <button
                                onClick={() => handleChecklistToggle(pendingChecklistItem.id, pendingChecklistItem.checked)}
                                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-medium ${pendingChecklistItem.checked ? 'bg-amber-500' : 'bg-emerald-600'}`}
                            >
                                {pendingChecklistItem.checked ? 'Mark Incomplete' : 'Mark Complete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Customer Card ────────────────────────────────────────────────────────────
function CustomerCard({ customer, onSelect, onMoveStage }) {
    const [showStageMenu, setShowStageMenu] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!showStageMenu) return;
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowStageMenu(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showStageMenu]);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelect(customer)}>
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-800 text-base leading-tight">{customer.customer_name}</h3>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium ml-2 whitespace-nowrap">
                    {customer.quotation_number || customer.project_id || '–'}
                </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1">
                <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span>{customer.capacity ? `${customer.capacity} kWp` : '–'} {customer.project_type || ''}</span>
            </div>
            <div className="flex justify-between items-center text-sm mb-3">
                <span className="flex items-center gap-1 text-gray-500 text-xs">
                    <MapPin className="w-3 h-3" />{customer.location || '–'}
                </span>
                <span className="font-bold text-emerald-600 text-sm">
                    {customer.quoted_amount ? `₹${Number(customer.quoted_amount).toLocaleString('en-IN')}` : '–'}
                </span>
            </div>

            {/* Move to stage button */}
            <div className="relative" ref={dropdownRef} onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => setShowStageMenu(!showStageMenu)}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 font-medium transition-colors"
                >
                    <span>Move to Stage</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showStageMenu ? 'rotate-180' : ''}`} />
                </button>
                {showStageMenu && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-20 max-h-48 overflow-y-auto">
                        {STAGES.map(stage => (
                            <button
                                key={stage.id}
                                onClick={() => { onMoveStage(customer.id, stage.id); setShowStageMenu(false); }}
                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors ${customer.stage === stage.id ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-600'}`}
                            >
                                <stage.icon className="w-3.5 h-3.5 text-gray-400" />
                                {stage.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard({ user, onLogout }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedStage, setSelectedStage] = useState('leads');
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('admin')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error) setCustomers(data || []);
        else console.error('Error fetching data:', error);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        const channel = supabase
            .channel('admin_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'admin' }, fetchData)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const handleUpdateCustomer = async (id, updates) => {
        const { error } = await supabase.from('admin').update(updates).eq('id', id);
        if (!error) {
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            if (selectedCustomer?.id === id) setSelectedCustomer(prev => ({ ...prev, ...updates }));
        }
    };

    const handleDeleteCustomer = async (id) => {
        await supabase.from('admin').delete().eq('id', id);
        setCustomers(prev => prev.filter(c => c.id !== id));
    };

    const handleMoveStage = async (id, newStage) => {
        await handleUpdateCustomer(id, { stage: newStage });
    };

    const filtered = customers.filter(c => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            c.customer_name?.toLowerCase().includes(searchLower) ||
            c.phone?.includes(searchQuery) ||
            c.quotation_number?.toLowerCase().includes(searchLower);
        const matchesStage = c.stage?.toLowerCase() === selectedStage.toLowerCase();
        const isAuthorized = user.userType === 'admin' || c.poc_name === user.name;
        return matchesStage && matchesSearch && isAuthorized;
    });

    const stageCounts = STAGES.reduce((acc, s) => {
        acc[s.id] = customers.filter(c => c.stage?.toLowerCase() === s.id.toLowerCase()).length;
        return acc;
    }, {});

    if (user.userType === 'agent') return <AgentForm user={user} onLogout={onLogout} />;
    if (user.userType === 'sales') return <SalesView customers={customers} loading={loading} user={user} onUpdate={handleMoveStage} />;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 border-b flex justify-between items-center">
                    <span className="font-bold text-lg text-gray-900">Ray2Volt</span>
                    <button className="lg:hidden text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    <button
                        onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-colors ${currentView === 'dashboard' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>

                    <div className="text-[10px] uppercase font-bold text-gray-400 px-3 pt-4 pb-2 tracking-wider">Stages</div>

                    {STAGES.map(s => (
                        <button
                            key={s.id}
                            onClick={() => { setCurrentView('stages'); setSelectedStage(s.id); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-colors ${currentView === 'stages' && selectedStage === s.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <s.icon className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 text-left truncate text-xs">{s.label}</span>
                            {stageCounts[s.id] > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${currentView === 'stages' && selectedStage === s.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {stageCounts[s.id]}
                                </span>
                            )}
                        </button>
                    ))}

                    <button
                        onClick={() => { setCurrentView('activity'); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mt-1 transition-colors ${currentView === 'activity' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <Activity className="w-4 h-4" /> Activity Log
                    </button>
                </div>

                <div className="p-3 border-t">
                    <div className="flex items-center gap-3 px-3 py-2 mb-1">
                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'A'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{user.name}</p>
                            <p className="text-[10px] text-gray-400">{user.role}</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                <header className="h-16 bg-white border-b px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500"><Menu className="w-6 h-6" /></button>
                        <h1 className="font-bold text-gray-800">
                            {currentView === 'dashboard' ? 'Business Dashboard' : currentView === 'activity' ? 'Activity Log' : STAGES.find(s => s.id === selectedStage)?.label}
                        </h1>
                    </div>
                    {currentView === 'stages' && (
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 w-48"
                            />
                        </div>
                    )}
                </header>

                <div className="flex-1 p-4 lg:p-6">
                    {currentView === 'dashboard' && (
                        <DashboardView
                            customers={customers.map(c => ({
                                ...c,
                                currentStage: c.stage,
                                quotedAmount: c.quoted_amount,
                                capacity: parseFloat(c.capacity) || 0,
                                customerName: c.customer_name,
                                intent: c.intent_level,
                            }))}
                            loading={loading}
                        />
                    )}

                    {currentView === 'stages' && (
                        loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : filtered.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filtered.map(c => (
                                    <CustomerCard
                                        key={c.id}
                                        customer={c}
                                        onSelect={setSelectedCustomer}
                                        onMoveStage={handleMoveStage}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Users className="w-12 h-12 mb-3 text-gray-300" />
                                <p className="font-medium text-gray-500">{searchQuery ? 'No matching results' : 'No customers in this stage'}</p>
                                <p className="text-sm mt-1">{searchQuery ? 'Try a different search' : 'Move customers here from another stage'}</p>
                            </div>
                        )
                    )}
                </div>
            </main>

            {selectedCustomer && (
                <CustomerDetailModal
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                    onUpdate={handleUpdateCustomer}
                    onDelete={handleDeleteCustomer}
                    user={user}
                />
            )}
        </div>
    );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                if (profile) setUser({ id: session.user.id, email: session.user.email, name: profile.name, role: profile.role, userType: profile.user_type });
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!session) { setUser(null); setLoading(false); }
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return !user
        ? <LoginScreen onLogin={setUser} />
        : <Dashboard user={user} onLogout={async () => { await supabase.auth.signOut(); setUser(null); }} />;
}
```