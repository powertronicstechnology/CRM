// ─── utils.jsx ────────────────────────────────────────────────────────────────
// Pure utility functions — no UI, no React state.
// ──────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase';

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
