BEGIN;
CREATE OR REPLACE FUNCTION crm_private.rename_dropdown_option(p_category text, p_old text, p_new text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n text := btrim(p_new); affected integer := 0; col text; old_final text;
BEGIN
 IF auth.uid() IS NULL OR crm_private.current_role() IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_category NOT IN ('panel','inverter','meter_phase','payment_method','project_type','financial_tag_general','financial_tag_surya') THEN RAISE EXCEPTION 'Unsupported dropdown'; END IF;
 IF n IS NULL OR n='' OR length(n)>120 THEN RAISE EXCEPTION 'Enter a name between 1 and 120 characters'; END IF;
 -- Serialize configuration changes and keep metadata/customer updates atomic.
 LOCK TABLE public.metadata IN SHARE ROW EXCLUSIVE MODE;
 IF NOT EXISTS(SELECT 1 FROM public.metadata WHERE category=p_category AND label=p_old) THEN RAISE EXCEPTION 'Option no longer exists. Refresh and try again'; END IF;
 IF n=p_old THEN RETURN jsonb_build_object('updated',0); END IF;
 IF EXISTS(SELECT 1 FROM public.metadata WHERE category=p_category AND lower(label)=lower(n) AND label<>p_old) THEN RAISE EXCEPTION 'An option with that name already exists'; END IF;
 IF p_category='project_type' AND (lower(p_old) LIKE '%surya%') IS DISTINCT FROM (lower(n) LIKE '%surya%') THEN RAISE EXCEPTION 'Keep Surya in a Surya project name; renaming must not change its payment rules'; END IF;
 IF p_category IN ('financial_tag_general','financial_tag_surya') THEN
   SELECT label INTO old_final FROM public.metadata WHERE category='system_'||p_category LIMIT 1;
   old_final := coalesce(old_final, CASE WHEN p_category='financial_tag_surya' THEN 'Final payment after meter installation' ELSE 'Final payment' END);
   IF p_old=old_final THEN
     DELETE FROM public.metadata WHERE category='system_'||p_category;
     INSERT INTO public.metadata(category,label) VALUES('system_'||p_category,n);
   END IF;
 END IF;
 UPDATE public.metadata SET label=n WHERE category=p_category AND label=p_old;
 IF p_category='payment_method' THEN
   UPDATE public.admin a SET
    payment_remark_1=CASE WHEN payment_remark_1=p_old THEN n ELSE payment_remark_1 END,
    payment_remark_2=CASE WHEN payment_remark_2=p_old THEN n ELSE payment_remark_2 END,
    payment_remark_3=CASE WHEN payment_remark_3=p_old THEN n ELSE payment_remark_3 END,
    payment_remark_4=CASE WHEN payment_remark_4=p_old THEN n ELSE payment_remark_4 END,
    payment_remark_5=CASE WHEN payment_remark_5=p_old THEN n ELSE payment_remark_5 END,
    payments=CASE WHEN jsonb_typeof(payments)='array' THEN
       (SELECT coalesce(jsonb_agg(CASE WHEN e->>'remark'=p_old THEN jsonb_set(e,'{remark}',to_jsonb(n)) ELSE e END ORDER BY ord),'[]'::jsonb) FROM jsonb_array_elements(payments) WITH ORDINALITY x(e,ord)) ELSE payments END
   WHERE p_old IN (payment_remark_1,payment_remark_2,payment_remark_3,payment_remark_4,payment_remark_5)
     OR (jsonb_typeof(payments)='array' AND payments @> jsonb_build_array(jsonb_build_object('remark',p_old)));
 ELSIF p_category IN ('financial_tag_general','financial_tag_surya') THEN
   UPDATE public.admin SET financial_tag=n WHERE financial_tag=p_old
     AND (lower(coalesce(project_type,'')) LIKE '%surya%')=(p_category='financial_tag_surya');
 ELSE
   col := p_category;
   EXECUTE format('UPDATE public.admin SET %I=$1 WHERE %I=$2',col,col) USING n,p_old;
 END IF;
 GET DIAGNOSTICS affected=ROW_COUNT;
 INSERT INTO public.activity_log(user_id,action,message,new_value)
 VALUES(auth.uid(),'metadata',format('Renamed %s: %s → %s (%s customer records)',p_category,p_old,n,affected),n);
 RETURN jsonb_build_object('updated',affected);
END $$;
REVOKE ALL ON FUNCTION crm_private.rename_dropdown_option(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION crm_private.rename_dropdown_option(text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.rename_dropdown_option(p_category text,p_old text,p_new text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT crm_private.rename_dropdown_option(p_category,p_old,p_new);
$$;
REVOKE ALL ON FUNCTION public.rename_dropdown_option(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rename_dropdown_option(text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.handle_admin_financial_sync()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    calculated_received NUMERIC := 0;
    calculated_quoted NUMERIC := 0;
    calculated_receivables NUMERIC := 0;
    latest_payment_date DATE := NULL;
    general_final text;
    surya_final text;
BEGIN
    SELECT label INTO general_final FROM public.metadata WHERE category='system_financial_tag_general' LIMIT 1;
    SELECT label INTO surya_final FROM public.metadata WHERE category='system_financial_tag_surya' LIMIT 1;
    general_final := coalesce(general_final, 'Final payment');
    surya_final := coalesce(surya_final, 'Final payment after meter installation');
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
            NEW.financial_tag := surya_final;
        ELSE
            NEW.financial_tag := general_final;
        END IF;

    ELSIF NEW.financial_tag IN (general_final, surya_final) THEN
        NEW.financial_tag := NULL;
    END IF;

    RETURN NEW;
END;
$function$
;
DROP TRIGGER IF EXISTS trg_admin_financial_sync ON public.admin;
CREATE TRIGGER trg_admin_financial_sync BEFORE INSERT OR UPDATE OF
 quoted_amount, quoted_amount_3, payment_1, payment_2, payment_3, payment_4, payment_5,
 payment_date_1, payment_date_2, payment_date_3, payment_date_4, payment_date_5, project_type
ON public.admin FOR EACH ROW EXECUTE FUNCTION public.handle_admin_financial_sync();
NOTIFY pgrst,'reload schema';
COMMIT;
