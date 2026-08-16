// ─── utils.jsx ────────────────────────────────────────────────────────────────
// Pure utility functions — no UI, no React state.
// ──────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';
import { PRIMARY_STAGES, FINANCIAL_TAGS } from './constants';

// ─── Activity Logging ─────────────────────────────────────────────────────────
export async function logActivity(userId, action, message, details = '') {
    try {
        const { error } = await supabase.from('activity_log').insert({
            user_id: userId || null, 
            action, 
            message,
            new_value: details || null
        });
        if (error) {
            console.error('Supabase activity log error:', error);
        }
    } catch (e) { 
        console.error('Activity log exception:', e); 
    }
}

// ─── Metadata Hook ────────────────────────────────────────────────────────────
// Fetches the 'metadata' table once and returns a grouped object like:
// { company_branch: ['Delhi', 'Mumbai'], poc: ['Alice', 'Bob'], ... }
import { useState, useEffect } from 'react';

export function useMetadata() {
    const [meta, setMeta] = useState({});
    useEffect(() => {
        supabase.from('metadata').select('category, label').then(({ data }) => {
            const defaults = {
                panel: ['ADANI', 'WAAREE', 'PAHAL', 'ADANI TOPCON', 'WAAREE TOPCON', 'PAHAL TOPCON'],
                inverter: ['SOLARYAAN', 'KSOLARE', 'GROWATT', 'POLYCAB', 'WAAREE', 'YAAN'],
                meter_phase: ['S', 'T', 'T (EXTEN)'],
                payment_type: ['Online', 'Cheque'],
                project_type: ['General', 'PM Surya Ghar'],
            };
            const grouped = { ...defaults };
            if (data) {
                data.forEach(({ category, label }) => {
                    if (!grouped[category]) grouped[category] = [];
                    if (!grouped[category].includes(label)) {
                        grouped[category].push(label);
                    }
                });
            }
            setMeta(grouped);
        });
    }, []);
    return meta;
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
export function exportAllToCSV(customers) {
    const headers = [
        'CRN', 'Customer Name', 'Phone', 'Email', 'Location', 'Branch',
        'Capacity (kWp)', 'Project Type', 'POC', 'Stage', 'Financial Tag',
        'Quoted Amount', 'Quoted Amount 2', 'Quoted Amount 3', 'Bank Quote', 'Receivables', 'Discount',
        'Payment Type', 'Bank Name', 'Account #', 'IFSC', 'Loan Application #',
        'Meter Category', 'EB Number', 'DTR Code', 'Sanctioned Load',
        'DISCOM Division', 'Net Metering', 'Vendor', 'Aadhar',
        'Application #', 'Application Date', 'Google Docs', 'Created At',
        'Date', 'PO No', 'Bill No', 'Internal Remarks'
    ];
    const rows = customers.map(c => {
        const tagLabel = FINANCIAL_TAGS.find(f => f.id === c.financial_tag)?.label || c.financial_tag || '';
        return [
            c.crn || '', c.customer_name || '', c.phone_number || '', c.email || '',
            c.full_installation_address || '', c.company_branch || '', c.system_capacity_kwp || '',
            c.project_type || '', c.poc || '',
            PRIMARY_STAGES.find(s => s.id === c.stage)?.label || c.stage || '',
            tagLabel, c.quoted_amount || '', c.quoted_amount_2 || '', c.quoted_amount_3 || '', c.quote_to_bank || '',
            c.receivables || '', c.discount || '',
            c.payment_type || '', c.bank_name || '', c.bank_account_number || '',
            c.ifsc_code || '', c.loan_application_number || '', c.meter_category || '',
            c.eb_number || '', c.dtr_code || '', c.sanctioned_load || '',
            c.discom_division || '', c.net_metering || '', c.vendor || '',
            c.aadhar || '', c.application_number || '', c.application_date || '',
            c.google_docs || '',
            c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '',
            c.date || '', c.po_no || '', c.bill_no || '', c.internal_remarks || '',
        ].map(val => {
            const strVal = String(val);
            if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                return `"${strVal.replace(/"/g, '""')}"`;
            }
            return strVal;
        }).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solarflow_customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Date / Number Formatters ─────────────────────────────────────────────────
export function formatLogDate(dateStr) {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}-${month}-${year} ${timeStr}`;
}

export function formatDate(dateStr) {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

export function formatIndianCurrency(val, compact = true) {
    const n = Number(val) || 0;
    if (compact) {
        if (n >= 1_00_00_000) {
            const formatted = (n / 1_00_00_000).toFixed(2);
            return `₹${parseFloat(formatted)} Cr`;
        }
        if (n >= 1_00_000) {
            const formatted = (n / 1_00_000).toFixed(2);
            return `₹${parseFloat(formatted)} L`;
        }
    }
    return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
