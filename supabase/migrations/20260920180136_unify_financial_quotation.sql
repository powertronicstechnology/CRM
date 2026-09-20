-- Finance quotation wins; preserve all original quotation values.
BEGIN;
DROP TRIGGER IF EXISTS trg_update_admin_totals ON public.admin;
DROP TRIGGER IF EXISTS trg_admin_financial_sync ON public.admin;
CREATE OR REPLACE FUNCTION public.handle_admin_financial_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    calculated_received NUMERIC := 0;
    calculated_quoted NUMERIC := 0;
    calculated_receivables NUMERIC := 0;
    latest_payment_date DATE := NULL;
BEGIN
    calculated_received := COALESCE(NEW.payment_1, 0) +
                           COALESCE(NEW.payment_2, 0) +
                           COALESCE(NEW.payment_3, 0) +
                           COALESCE(NEW.payment_4, 0) +
                           COALESCE(NEW.payment_5, 0);

    IF NEW.payment_5 IS NOT NULL AND NEW.payment_date_5 IS NOT NULL THEN
        latest_payment_date := NEW.payment_date_5;
    ELSIF NEW.payment_4 IS NOT NULL AND NEW.payment_date_4 IS NOT NULL THEN
        latest_payment_date := NEW.payment_date_4;
    ELSIF NEW.payment_3 IS NOT NULL AND NEW.payment_date_3 IS NOT NULL THEN
        latest_payment_date := NEW.payment_date_3;
    ELSIF NEW.payment_2 IS NOT NULL AND NEW.payment_date_2 IS NOT NULL THEN
        latest_payment_date := NEW.payment_date_2;
    ELSIF NEW.payment_1 IS NOT NULL AND NEW.payment_date_1 IS NOT NULL THEN
        latest_payment_date := NEW.payment_date_1;
    END IF;

    IF latest_payment_date IS NOT NULL THEN
        NEW.payment_reciept := latest_payment_date;
    END IF;

    NEW.total_received := calculated_received;

    calculated_quoted := COALESCE(NEW.quoted_amount_3, NEW.quoted_amount, 0);

    calculated_receivables := GREATEST(
        0,
        calculated_quoted - calculated_received
    );

    NEW.receivables := calculated_receivables;

    IF calculated_receivables = 0
       AND (calculated_received > 0 OR calculated_quoted > 0) THEN

        IF LOWER(COALESCE(NEW.project_type, '')) LIKE '%surya%' THEN
            NEW.financial_tag := 'Final payment after meter installation';
        ELSE
            NEW.financial_tag := 'Final payment';
        END IF;

    ELSIF NEW.financial_tag IN ('Final payment', 'Final payment after meter installation') THEN
        NEW.financial_tag := NULL;
    END IF;

    RETURN NEW;
END;
$function$
;
CREATE TRIGGER trg_admin_financial_sync BEFORE INSERT OR UPDATE OF
 quoted_amount, quoted_amount_3, payment_1, payment_2, payment_3, payment_4, payment_5,
 payment_date_1, payment_date_2, payment_date_3, payment_date_4, payment_date_5, project_type
ON public.admin FOR EACH ROW EXECUTE FUNCTION public.handle_admin_financial_sync();
-- Repair totals without changing quotations, receipts or historical tags.
UPDATE public.admin SET
 total_received = COALESCE(payment_1,0)+COALESCE(payment_2,0)+COALESCE(payment_3,0)+COALESCE(payment_4,0)+COALESCE(payment_5,0),
 receivables = GREATEST(0, COALESCE(quoted_amount_3,quoted_amount,0) -
 (COALESCE(payment_1,0)+COALESCE(payment_2,0)+COALESCE(payment_3,0)+COALESCE(payment_4,0)+COALESCE(payment_5,0)));
COMMIT;
