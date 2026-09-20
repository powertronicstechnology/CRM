-- Staff may read a single accessible customer's history, not the global audit table.
BEGIN;
CREATE OR REPLACE FUNCTION crm_private.customer_activity(customer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE access_role text := crm_private.current_role(); result jsonb;
BEGIN
 IF auth.uid() IS NULL OR access_role IS NULL OR access_role NOT IN ('staff','admin') THEN
  RAISE EXCEPTION 'Active account required' USING ERRCODE='42501';
 END IF;
 IF customer_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.admin a WHERE a.id=customer_id AND (a.deleted_at IS NULL OR access_role='admin')
 ) THEN RAISE EXCEPTION 'Customer unavailable' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(entry ORDER BY created_at DESC,id DESC),'[]'::jsonb) INTO result
 FROM (
  SELECT l.id,l.created_at,jsonb_build_object('id',l.id,'action',l.action,'message',l.message,
    'created_at',l.created_at,'profiles',jsonb_build_object('name',p.name)) AS entry
  FROM public.activity_log l LEFT JOIN public.profiles p ON p.id=l.user_id
  WHERE l.new_value=customer_id::text
  ORDER BY l.created_at DESC,l.id DESC LIMIT 50
 ) events;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION crm_private.customer_activity(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION crm_private.customer_activity(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.customer_activity(customer_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT crm_private.customer_activity(customer_id);
$$;
REVOKE ALL ON FUNCTION public.customer_activity(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_activity(uuid) TO authenticated;
-- Existing activity_admin_read RLS policy remains unchanged.
NOTIFY pgrst, 'reload schema';
COMMIT;
