-- Structural fixture from supplied metadata; contains no customer data.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
CREATE TABLE public.activity_log ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"user_id" uuid,"action" text NOT NULL,"message" text NOT NULL,"new_value" text,"created_at" timestamp with time zone DEFAULT now());
CREATE TABLE public.admin ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"crn" text,"created_at" timestamp with time zone DEFAULT now(),"updated_at" timestamp with time zone DEFAULT now(),"deleted_at" timestamp with time zone,"customer_name" text NOT NULL,"phone_number" numeric,"full_installation_address" text,"area" text,"system_capacity_kwp" numeric,"application_no" text,"panel" text,"inverter" text,"date_of_registration" date,"meter_phase" text,"file_given_to_customer" boolean,"meter_file_submission" boolean,"meter_instaled" boolean,"panel_and_inverter" boolean,"fabrication_and_wiring" boolean,"payment_reciept" text,"stage" text DEFAULT 'REGISTRATION PENDING'::text,"financial_tag" text,"quoted_amount" numeric,"total_received" numeric DEFAULT 0,"receivables" numeric DEFAULT 0,"subsidy_history" jsonb DEFAULT '[]'::jsonb,"follow_ups" jsonb DEFAULT '[]'::jsonb,"internal_remarks" text,"project_checklist" jsonb DEFAULT '[]'::jsonb,"project_type" text,"application_done_by" text,"consumer_number" numeric,"quoted_amount_2" text,"subsidy_claim" date,"subsidy_recieved" date,"payment_notes" text,"file_ready_to_customer" boolean,"panel_and_inverter_remarks" text,"fabrication_and_wiring_remarks" text,"date" date,"po_no" text,"payment_1" numeric,"payment_2" numeric,"payment_3" numeric,"payment_4" numeric,"payment_5" numeric,"payment_remark_1" text,"payment_remark_2" text,"payment_remark_3" text,"payment_remark_4" text,"payment_remark_5" text,"bill_no" text,"quoted_amount_3" numeric,"meter_installed" text,"stages_remarks" jsonb,"payment_date_1" date,"payment_date_2" date,"payment_date_3" date,"payment_date_4" date,"payment_date_5" date,"payments" jsonb DEFAULT '[]'::jsonb,"subsidy_received" date);
CREATE TABLE public.metadata ("id" uuid DEFAULT gen_random_uuid() NOT NULL,"category" text NOT NULL,"label" text NOT NULL);
CREATE TABLE public.profiles ("id" uuid NOT NULL,"name" text NOT NULL,"email" text NOT NULL,"user_type" text DEFAULT 'agent'::text NOT NULL,"code" text,"branch" text,"created_at" timestamp with time zone DEFAULT now(),"role" text,"status" text DEFAULT 'active'::text);
ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);
ALTER TABLE public.admin ADD CONSTRAINT admin_pkey PRIMARY KEY (id);
ALTER TABLE public.metadata ADD CONSTRAINT metadata_category_label_key UNIQUE (category, label);
ALTER TABLE public.metadata ADD CONSTRAINT metadata_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type = ANY (ARRAY['admin'::text, 'office'::text, 'agent'::text]));
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

    calculated_quoted := COALESCE(NEW.quoted_amount_3, 0);

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

    END IF;

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.update_admin_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.total_received := coalesce(new.payment_1, 0)
                       + coalesce(new.payment_2, 0)
                       + coalesce(new.payment_3, 0)
                       + coalesce(new.payment_4, 0)
                       + coalesce(new.payment_5, 0);

  new.receivables := coalesce(new.quoted_amount, 0) - new.total_received;

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
CREATE TRIGGER trg_admin_financial_sync BEFORE INSERT OR UPDATE ON admin FOR EACH ROW EXECUTE FUNCTION handle_admin_financial_sync();
CREATE TRIGGER trg_update_admin_totals BEFORE INSERT OR UPDATE OF payment_1, payment_2, payment_3, payment_4, payment_5, quoted_amount ON admin FOR EACH ROW EXECUTE FUNCTION update_admin_totals();
ALTER TABLE public.activity_log ADD CONSTRAINT fk_activity_log_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_user::text $$;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated,anon;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY; GRANT ALL ON public.activity_log TO anon,authenticated,service_role;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY; GRANT ALL ON public.admin TO anon,authenticated,service_role;
ALTER TABLE public.metadata ENABLE ROW LEVEL SECURITY; GRANT ALL ON public.metadata TO anon,authenticated,service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; GRANT ALL ON public.profiles TO anon,authenticated,service_role;
CREATE POLICY "auth_insert_activity_log" ON public.activity_log FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "auth_select_activity_log" ON public.activity_log FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "admin_delete_admin" ON public.admin FOR DELETE TO public USING (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.user_type = 'admin'::text))))));
CREATE POLICY "auth_insert_admin" ON public.admin FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "auth_select_admin" ON public.admin FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "auth_update_admin" ON public.admin FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "auth_insert_metadata" ON public.metadata FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "auth_modify_metadata" ON public.metadata FOR ALL TO public USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));
CREATE POLICY "auth_select_metadata" ON public.metadata FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "admin_update_profiles" ON public.profiles FOR UPDATE TO public USING (((auth.role() = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.user_type = 'admin'::text))))));
CREATE POLICY "auth_select_profiles" ON public.profiles FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY "self_update_profiles" ON public.profiles FOR UPDATE TO public USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
