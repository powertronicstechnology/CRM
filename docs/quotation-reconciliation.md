# Quotation reconciliation

Finance quotation (`quoted_amount_3`) is authoritative, including zero. A missing Finance quotation falls back to the original (`quoted_amount`). The legacy text column (`quoted_amount_2`) is retained in exports but never interpreted as money.

The UI shows differing original/Finance quotations side by side. Both Excel tabs include the effective quotation, original and Finance values. Receivables are the effective quotation minus receipts, with a minimum of zero; card balances can show a negative overpayment.

## Owner applies in Supabase

Run `supabase/migrations/20260920180136_unify_financial_quotation.sql` in SQL Editor after the existing two-role patch. This transaction removes the competing totals trigger, replaces the financial sync formula, and recalculates stored total_received and receivables from the five payment columns. It preserves all quotation columns, receipt history and historical financial tags. Future financial edits clear a stale automatic final-payment tag if money is still due.

No live database change has been performed here. This patch does not require redeploying add_user.

After applying, this should return zero:

```sql
SELECT count(*) AS mismatched_balances FROM public.admin
WHERE receivables IS DISTINCT FROM GREATEST(0, COALESCE(quoted_amount_3, quoted_amount, 0) - (COALESCE(payment_1,0)+COALESCE(payment_2,0)+COALESCE(payment_3,0)+COALESCE(payment_4,0)+COALESCE(payment_5,0)));
```
