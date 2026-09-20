// A zero Finance quotation is intentional, not missing.
export const hasQuotation = value => value != null && String(value).trim() !== '';
export const quotationAmount = record => Number(hasQuotation(record.quoted_amount_3) ? record.quoted_amount_3 : record.quoted_amount) || 0;
export const quotationMismatch = record => hasQuotation(record.quoted_amount) && hasQuotation(record.quoted_amount_3) && Number(record.quoted_amount) !== Number(record.quoted_amount_3);
export const receivableAmount = record => Math.max(0, Math.round((quotationAmount(record) - (Number(record.total_received) || 0)) * 100) / 100);
