import { supabase } from './supabase';
import fields from './recordFields.json';

// SQL independently checks all permissions; this only shapes UI payloads.
export function editablePatch(userType, input, original = null) {
    // Accounts/Manager field sets remain in recordFields.json for a future rollout.
    const allowed = ['admin', 'staff'].includes(userType) ? fields.allWrite : [];
    return Object.fromEntries(Object.entries(input).filter(([key, value]) =>
        allowed.includes(key) && value !== undefined
        && (!original || JSON.stringify(original[key]) !== JSON.stringify(value))));
}

export async function recordRequest(action, recordId = null, payload = {}) {
    const { data, error } = await supabase.rpc('crm_records', {
        action, record_id: recordId, payload,
    });
    if (error) throw new Error(error.message || 'Unable to access records');
    return data;
}
