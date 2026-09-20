-- Apply after the four-role migration. No records or accounts are deleted.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_type IS NULL OR user_type NOT IN ('admin','staff')) THEN
    RAISE EXCEPTION 'Accounts outside Admin/Staff exist. Review and explicitly reassign them before applying this patch.';
  END IF;
END $$;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_label_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type IS NOT NULL AND user_type IN ('staff','admin'));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_label_check CHECK (role IS NOT NULL AND role=CASE user_type WHEN 'staff' THEN 'Staff' WHEN 'admin' THEN 'Admin' END);

-- Accounts and Manager remain documented in the historical migration, but cannot log in.
CREATE OR REPLACE FUNCTION crm_private.current_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.user_type FROM public.profiles p
  WHERE p.id=(SELECT auth.uid()) AND p.status='active' AND p.user_type IN ('staff','admin');
$$;
REVOKE ALL ON FUNCTION crm_private.current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION crm_private.current_role() TO authenticated;

-- Staff now has CRM + finance access, without Admin-only controls or deleted records.
CREATE OR REPLACE FUNCTION crm_private.record_columns(access_role text, writing boolean)
RETURNS text[] LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT CASE
 WHEN writing AND access_role IN ('staff','admin') THEN ARRAY['customer_name','project_type','stage','phone_number','full_installation_address','area','subdivision','system_capacity_kwp','application_no','panel','inverter','date_of_registration','meter_phase','consumer_number','file_given_to_customer','meter_file_submission','meter_instaled','panel_and_inverter','fabrication_and_wiring','file_ready_to_customer','panel_and_inverter_remarks','fabrication_and_wiring_remarks','project_checklist','follow_ups','internal_remarks','stages_remarks','application_done_by','meter_installed','financial_tag','quoted_amount','quoted_amount_2','quoted_amount_3','subsidy_history','subsidy_claim','subsidy_received','subsidy_recieved','payment_reciept','payment_notes','date','po_no','bill_no','payments','payment_1','payment_remark_1','payment_date_1','payment_2','payment_remark_2','payment_date_2','payment_3','payment_remark_3','payment_date_3','payment_4','payment_remark_4','payment_date_4','payment_5','payment_remark_5','payment_date_5']::text[]
 WHEN NOT writing AND access_role='staff' THEN ARRAY['id','crn','customer_name','project_type','created_at','updated_at','stage','phone_number','full_installation_address','area','subdivision','system_capacity_kwp','application_no','panel','inverter','date_of_registration','meter_phase','consumer_number','file_given_to_customer','meter_file_submission','meter_instaled','panel_and_inverter','fabrication_and_wiring','file_ready_to_customer','panel_and_inverter_remarks','fabrication_and_wiring_remarks','project_checklist','follow_ups','internal_remarks','stages_remarks','application_done_by','meter_installed','financial_tag','quoted_amount','quoted_amount_2','quoted_amount_3','total_received','receivables','subsidy_history','subsidy_claim','subsidy_received','subsidy_recieved','payment_reciept','payment_notes','date','po_no','bill_no','payments','payment_1','payment_remark_1','payment_date_1','payment_2','payment_remark_2','payment_date_2','payment_3','payment_remark_3','payment_date_3','payment_4','payment_remark_4','payment_date_4','payment_5','payment_remark_5','payment_date_5']::text[]
 WHEN NOT writing AND access_role='admin' THEN ARRAY['id','crn','customer_name','project_type','created_at','updated_at','stage','phone_number','full_installation_address','area','subdivision','system_capacity_kwp','application_no','panel','inverter','date_of_registration','meter_phase','consumer_number','file_given_to_customer','meter_file_submission','meter_instaled','panel_and_inverter','fabrication_and_wiring','file_ready_to_customer','panel_and_inverter_remarks','fabrication_and_wiring_remarks','project_checklist','follow_ups','internal_remarks','stages_remarks','application_done_by','meter_installed','financial_tag','quoted_amount','quoted_amount_2','quoted_amount_3','total_received','receivables','subsidy_history','subsidy_claim','subsidy_received','subsidy_recieved','payment_reciept','payment_notes','date','po_no','bill_no','payments','payment_1','payment_remark_1','payment_date_1','payment_2','payment_remark_2','payment_date_2','payment_3','payment_remark_3','payment_date_3','payment_4','payment_remark_4','payment_date_4','payment_5','payment_remark_5','payment_date_5','deleted_at']::text[]
 ELSE ARRAY[]::text[] END;
$$;
REVOKE ALL ON FUNCTION crm_private.record_columns(text, boolean) FROM PUBLIC, anon, authenticated;
COMMIT;
