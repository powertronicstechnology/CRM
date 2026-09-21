export const DROPDOWN_LABELS = { panel: 'Panels', inverter: 'Inverters', meter_phase: 'Meter phases', payment_method: 'Payment methods', project_type: 'Project types', financial_tag_general: 'Financial tags · General', financial_tag_surya: 'Financial tags · PM Surya Ghar' };
export const DROPDOWN_DEFAULTS = {"panel": ["ADANI", "WAAREE", "PAHAL", "ADANI TOPCON", "WAAREE TOPCON", "PAHAL TOPCON"], "inverter": ["SOLARYAAN", "KSOLARE", "GROWATT", "POLYCAB", "WAAREE", "YAAN"], "meter_phase": ["S", "T", "T (EXTEN)"], "payment_method": ["ONL", "CHQ", "DD", "CASH"], "project_type": ["General", "PM Surya Ghar"], "financial_tag_general": ["Initial", "Installation", "Final payment"], "financial_tag_surya": ["Registration payment 20k", "Installation payment", "Quotation amount", "Final payment after meter installation"]};
export function groupDropdowns(rows = []) {
 const ready = rows.some(r => r.category === 'dropdown_config' && r.label === 'initialized');
 const grouped = Object.fromEntries(Object.keys(DROPDOWN_DEFAULTS).map(k => [k, ready ? [] : [...DROPDOWN_DEFAULTS[k]]]));
 for (const {category, label} of rows) {
  if (!grouped[category]) continue;
  if (!grouped[category].some(v => v.toLowerCase() === label.toLowerCase())) grouped[category].push(label);
 }
 return {...grouped, _ready: ready};
}
export const withCurrentOption = (options = [], current) => current && !options.includes(current) ? [current, ...options] : options;
export const financialTags = (meta, projectType) => meta?.[String(projectType || '').toLowerCase().includes('surya') ? 'financial_tag_surya' : 'financial_tag_general'] ?? DROPDOWN_DEFAULTS[String(projectType || '').toLowerCase().includes('surya') ? 'financial_tag_surya' : 'financial_tag_general'];
