-- Four-role rollout. User applies manually with the matching frontend/function release.
-- This closes direct access to public.admin; the OLD frontend stops working after COMMIT.
-- No customer rows are moved or deleted. Keep crm_private out of exposed API schemas.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_type IS NULL OR user_type NOT IN ('admin','staff','accounts','manager')) THEN
    RAISE EXCEPTION 'Map existing legacy profiles explicitly before applying. Nothing was changed.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_type='admin' AND status='active') THEN
    RAISE EXCEPTION 'An active Admin is required.';
  END IF;
END $$;
ALTER TABLE public.admin ADD COLUMN IF NOT EXISTS subdivision text;
-- A customer-only edit must not recalculate restricted financial values.
-- Preserve the existing formula for now, but only run it on financial changes.
DROP TRIGGER IF EXISTS trg_admin_financial_sync ON public.admin;
CREATE TRIGGER trg_admin_financial_sync BEFORE INSERT OR UPDATE OF
  quoted_amount, quoted_amount_3,
  payment_1, payment_2, payment_3, payment_4, payment_5,
  payment_date_1, payment_date_2, payment_date_3, payment_date_4, payment_date_5
ON public.admin FOR EACH ROW EXECUTE FUNCTION public.handle_admin_financial_sync();
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_label_check;
UPDATE public.profiles SET role=CASE user_type WHEN 'staff' THEN 'Staff' WHEN 'accounts' THEN 'Accounts' WHEN 'manager' THEN 'Manager' WHEN 'admin' THEN 'Admin' END;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type IS NOT NULL AND user_type IN ('staff','accounts','manager','admin'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_label_check CHECK (role IS NOT NULL AND role=CASE user_type WHEN 'staff' THEN 'Staff' WHEN 'accounts' THEN 'Accounts' WHEN 'manager' THEN 'Manager' WHEN 'admin' THEN 'Admin' END);
CREATE SCHEMA IF NOT EXISTS crm_private;
REVOKE ALL ON SCHEMA crm_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA crm_private TO authenticated;

-- Only this fixed lookup bypasses profiles RLS, to avoid recursive role policies.
CREATE OR REPLACE FUNCTION crm_private.current_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.user_type FROM public.profiles p
  WHERE p.id=(SELECT auth.uid()) AND p.status='active'
    AND p.user_type IN ('staff','accounts','manager','admin');
$$;
REVOKE ALL ON FUNCTION crm_private.current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION crm_private.current_role() TO authenticated;

CREATE OR REPLACE FUNCTION crm_private.record_columns(access_role text, writing boolean)
RETURNS text[] LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT CASE
 WHEN writing AND access_role='staff' THEN ARRAY['customer_name','project_type','stage','phone_number','full_installation_address','area','subdivision','system_capacity_kwp','application_no','panel','inverter','date_of_registration','meter_phase','consumer_number','file_given_to_customer','meter_file_submission','meter_instaled','panel_and_inverter','fabrication_and_wiring','file_ready_to_customer','panel_and_inverter_remarks','fabrication_and_wiring_remarks','project_checklist','follow_ups','internal_remarks','stages_remarks','application_done_by','meter_installed']::text[]
 WHEN writing AND access_role='accounts' THEN ARRAY['project_type','financial_tag','quoted_amount','quoted_amount_2','quoted_amount_3','subsidy_history','subsidy_claim','subsidy_received','subsidy_recieved','payment_reciept','payment_notes','date','po_no','bill_no','payments','payment_1','payment_remark_1','payment_date_1','payment_2','payment_remark_2','payment_date_2','payment_3','payment_remark_3','payment_date_3','payment_4','payment_remark_4','payment_date_4','payment_5','payment_remark_5','payment_date_5']::text[]
 WHEN writing AND access_role IN ('manager','admin') THEN ARRAY['customer_name','project_type','stage','phone_number','full_installation_address','area','subdivision','system_capacity_kwp','application_no','panel','inverter','date_of_registration','meter_phase','consumer_number','file_given_to_customer','meter_file_submission','meter_instaled','panel_and_inverter','fabrication_and_wiring','file_ready_to_customer','panel_and_inverter_remarks','fabrication_and_wiring_remarks','project_checklist','follow_ups','internal_remarks','stages_remarks','application_done_by','meter_installed','financial_tag','quoted_amount','quoted_amount_2','quoted_amount_3','subsidy_history','subsidy_claim','subsidy_received','subsidy_recieved','payment_reciept','payment_notes','date','po_no','bill_no','payments','payment_1','payment_remark_1','payment_date_1','payment_2','payment_remark_2','payment_date_2','payment_3','payment_remark_3','payment_date_3','payment_4','payment_remark_4','payment_date_4','payment_5','payment_remark_5','payment_date_5']::text[]
 WHEN NOT writing AND access_role='staff' THEN ARRAY['id','crn','customer_name','project_type','created_at','updated_at','stage','phone_number','full_installation_address','area','subdivision','system_capacity_kwp','application_no','panel','inverter','date_of_registration','meter_phase','consumer_number','file_given_to_customer','meter_file_submission','meter_instaled','panel_and_inverter','fabrication_and_wiring','file_ready_to_customer','panel_and_inverter_remarks','fabrication_and_wiring_remarks','project_checklist','follow_ups','internal_remarks','stages_remarks','application_done_by','meter_installed','quoted_amount','payment_reciept','subsidy_claim','subsidy_received']::text[]
 WHEN NOT writing AND access_role='accounts' THEN ARRAY['id','crn','customer_name','project_type','created_at','updated_at','financial_tag','quoted_amount','quoted_amount_2','quoted_amount_3','total_received','receivables','subsidy_history','subsidy_claim','subsidy_received','subsidy_recieved','payment_reciept','payment_notes','date','po_no','bill_no','payments','payment_1','payment_remark_1','payment_date_1','payment_2','payment_remark_2','payment_date_2','payment_3','payment_remark_3','payment_date_3','payment_4','payment_remark_4','payment_date_4','payment_5','payment_remark_5','payment_date_5']::text[]
 WHEN NOT writing AND access_role='manager' THEN ARRAY['id','crn','customer_name','project_type','created_at','updated_at','stage','phone_number','full_installation_address','area','subdivision','system_capacity_kwp','application_no','panel','inverter','date_of_registration','meter_phase','consumer_number','file_given_to_customer','meter_file_submission','meter_instaled','panel_and_inverter','fabrication_and_wiring','file_ready_to_customer','panel_and_inverter_remarks','fabrication_and_wiring_remarks','project_checklist','follow_ups','internal_remarks','stages_remarks','application_done_by','meter_installed','financial_tag','quoted_amount','quoted_amount_2','quoted_amount_3','total_received','receivables','subsidy_history','subsidy_claim','subsidy_received','subsidy_recieved','payment_reciept','payment_notes','date','po_no','bill_no','payments','payment_1','payment_remark_1','payment_date_1','payment_2','payment_remark_2','payment_date_2','payment_3','payment_remark_3','payment_date_3','payment_4','payment_remark_4','payment_date_4','payment_5','payment_remark_5','payment_date_5']::text[]
 WHEN NOT writing AND access_role='admin' THEN ARRAY['id','crn','customer_name','project_type','created_at','updated_at','stage','phone_number','full_installation_address','area','subdivision','system_capacity_kwp','application_no','panel','inverter','date_of_registration','meter_phase','consumer_number','file_given_to_customer','meter_file_submission','meter_instaled','panel_and_inverter','fabrication_and_wiring','file_ready_to_customer','panel_and_inverter_remarks','fabrication_and_wiring_remarks','project_checklist','follow_ups','internal_remarks','stages_remarks','application_done_by','meter_installed','financial_tag','quoted_amount','quoted_amount_2','quoted_amount_3','total_received','receivables','subsidy_history','subsidy_claim','subsidy_received','subsidy_recieved','payment_reciept','payment_notes','date','po_no','bill_no','payments','payment_1','payment_remark_1','payment_date_1','payment_2','payment_remark_2','payment_date_2','payment_3','payment_remark_3','payment_date_3','payment_4','payment_remark_4','payment_date_4','payment_5','payment_remark_5','payment_date_5','deleted_at']::text[]
 ELSE ARRAY[]::text[] END;
$$;
REVOKE ALL ON FUNCTION crm_private.record_columns(text, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION crm_private.records(action text, record_id uuid, payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  access_role text := crm_private.current_role();
  columns_allowed text[];
  result jsonb;
  row_data public.admin;
  column_list text;
  value_list text;
  update_list text;
  changed_id uuid;
BEGIN
  IF auth.uid() IS NULL OR access_role IS NULL THEN
    RAISE EXCEPTION 'An active supported account is required' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(payload) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Payload must be an object' USING ERRCODE='22023';
  END IF;
  IF action='list' THEN
    SELECT COALESCE(jsonb_agg(projected.value ORDER BY a.created_at DESC, a.id), '[]'::jsonb)
    INTO result FROM public.admin a
    CROSS JOIN LATERAL (
      SELECT jsonb_object_agg(e.key,e.value) AS value FROM jsonb_each(to_jsonb(a)) e
      WHERE e.key=ANY(crm_private.record_columns(access_role,false))
    ) projected
    WHERE a.deleted_at IS NULL OR access_role='admin';
    RETURN result;
  END IF;
  IF action IN ('trash','restore','delete') THEN
    IF access_role <> 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
    IF action='delete' THEN
      DELETE FROM public.admin WHERE id=record_id AND deleted_at IS NOT NULL RETURNING id INTO changed_id;
    ELSE
      UPDATE public.admin SET deleted_at=CASE WHEN action='trash' THEN now() ELSE NULL END,
        updated_at=now() WHERE id=record_id RETURNING id INTO changed_id;
    END IF;
    IF changed_id IS NULL THEN RAISE EXCEPTION 'Record unavailable (permanent deletion requires Trash first)' USING ERRCODE='P0002'; END IF;
    INSERT INTO public.activity_log(user_id,action,message,new_value)
      VALUES(auth.uid(),action,'Record ' || action,changed_id::text);
    RETURN jsonb_build_object('id',changed_id);
  END IF;
  IF action NOT IN ('create','update') OR action IS NULL THEN
    RAISE EXCEPTION 'Unsupported action' USING ERRCODE='22023';
  END IF;
  IF action='create' AND access_role='accounts' THEN
    RAISE EXCEPTION 'CRM access is required to create a customer' USING ERRCODE='42501';
  END IF;
  columns_allowed := crm_private.record_columns(access_role,true);
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(payload) k WHERE NOT k=ANY(columns_allowed)) THEN
    RAISE EXCEPTION 'Field is not writable for this role' USING ERRCODE='42501';
  END IF;
  IF payload='{}'::jsonb THEN RAISE EXCEPTION 'No fields supplied' USING ERRCODE='22023'; END IF;
  IF action='create' THEN
    IF COALESCE(btrim(payload->>'customer_name'),'')='' THEN RAISE EXCEPTION 'Customer name required'; END IF;
    payload := payload || jsonb_build_object('application_done_by',
      (SELECT name FROM public.profiles WHERE id=auth.uid()));
    SELECT string_agg(format('%I',k),',' ORDER BY k), string_agg(format('p.%I',k),',' ORDER BY k)
      INTO column_list,value_list FROM jsonb_object_keys(payload) k;
    -- Identifiers come from the checked allowlist, values are bound parameters.
    EXECUTE format('INSERT INTO public.admin (%s) SELECT %s FROM jsonb_populate_record(NULL::public.admin,$1) p RETURNING *',column_list,value_list)
      INTO row_data USING payload;
  ELSE
    SELECT string_agg(format('%I=p.%I',k,k),',' ORDER BY k) INTO update_list FROM jsonb_object_keys(payload) k;
    EXECUTE format('UPDATE public.admin a SET %s, updated_at=now() FROM jsonb_populate_record(NULL::public.admin,$1) p WHERE a.id=$2 AND a.deleted_at IS NULL RETURNING a.*',update_list)
      INTO row_data USING payload,record_id;
    IF row_data.id IS NULL THEN RAISE EXCEPTION 'Record unavailable' USING ERRCODE='P0002'; END IF;
  END IF;
  INSERT INTO public.activity_log(user_id,action,message,new_value)
    VALUES(auth.uid(),action,'Record ' || action || ': ' || row_data.customer_name,row_data.id::text);
  SELECT jsonb_object_agg(key,value) INTO result FROM jsonb_each(to_jsonb(row_data))
    WHERE key=ANY(crm_private.record_columns(access_role,false));
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION crm_private.records(text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION crm_private.records(text,uuid,jsonb) TO authenticated;

-- Public wrapper runs with caller privileges. Privileged implementation is private
-- and authenticates the caller on EVERY call, including direct private calls.
CREATE OR REPLACE FUNCTION public.crm_records(action text, record_id uuid DEFAULT NULL, payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT crm_private.records(action,record_id,payload);
$$;
REVOKE ALL ON FUNCTION public.crm_records(text,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_records(text,uuid,jsonb) TO authenticated;

-- Remove all old permissive policies on the four application tables.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies
   WHERE schemaname='public' AND tablename IN ('admin','profiles','metadata','activity_log')
 LOOP EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename); END LOOP;
END $$;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin,public.profiles,public.metadata,public.activity_log FROM PUBLIC,anon,authenticated;
-- Remove any pre-existing column grants too (table revocation does not remove them).
DO $$ DECLARE c record; BEGIN
 FOR c IN SELECT table_name,string_agg(quote_ident(column_name),',') AS columns
   FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('admin','profiles','metadata','activity_log') GROUP BY table_name
 LOOP EXECUTE format('REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON public.%I FROM PUBLIC,anon,authenticated',c.columns,c.columns,c.columns,c.columns,c.table_name); END LOOP;
END $$;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (user_type,role) ON public.profiles TO authenticated;
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated
 USING (id=(SELECT auth.uid()) OR (SELECT crm_private.current_role())='admin');
CREATE POLICY profile_admin_update ON public.profiles FOR UPDATE TO authenticated
 USING ((SELECT crm_private.current_role())='admin') WITH CHECK ((SELECT crm_private.current_role())='admin');
GRANT SELECT,INSERT ON public.metadata TO authenticated;
GRANT UPDATE,DELETE ON public.metadata TO authenticated;
CREATE POLICY metadata_read ON public.metadata FOR SELECT TO authenticated USING ((SELECT crm_private.current_role()) IS NOT NULL);
CREATE POLICY metadata_insert ON public.metadata FOR INSERT TO authenticated WITH CHECK ((SELECT crm_private.current_role()) IS NOT NULL);
CREATE POLICY metadata_admin_update ON public.metadata FOR UPDATE TO authenticated USING ((SELECT crm_private.current_role())='admin') WITH CHECK ((SELECT crm_private.current_role())='admin');
CREATE POLICY metadata_admin_delete ON public.metadata FOR DELETE TO authenticated USING ((SELECT crm_private.current_role())='admin');
GRANT SELECT,INSERT ON public.activity_log TO authenticated;
CREATE POLICY activity_admin_read ON public.activity_log FOR SELECT TO authenticated USING ((SELECT crm_private.current_role())='admin');
CREATE POLICY activity_own_insert ON public.activity_log FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND (SELECT crm_private.current_role()) IS NOT NULL);

-- Keep at least one active Admin, including service-role Edge Function writes.
CREATE OR REPLACE FUNCTION crm_private.protect_last_admin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF OLD.user_type='admin' AND OLD.status='active' THEN
   IF TG_OP='DELETE' OR NEW.user_type IS DISTINCT FROM 'admin' OR NEW.status IS DISTINCT FROM 'active' THEN
     PERFORM pg_advisory_xact_lock(781904221);
     IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id<>OLD.id AND user_type='admin' AND status='active') THEN
       RAISE EXCEPTION 'Cannot remove the last active Admin' USING ERRCODE='42501';
     END IF;
   END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION crm_private.protect_last_admin() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS protect_last_admin ON public.profiles;
CREATE TRIGGER protect_last_admin BEFORE UPDATE OR DELETE ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION crm_private.protect_last_admin();
COMMIT;

-- Share this structural verification result. Expected booleans: false, false, true.
SELECT has_table_privilege('authenticated','public.admin','SELECT') AS direct_record_read,
 has_table_privilege('anon','public.admin','SELECT') AS anonymous_record_read,
 has_function_privilege('authenticated','public.crm_records(text,uuid,jsonb)','EXECUTE') AS authenticated_rpc;
