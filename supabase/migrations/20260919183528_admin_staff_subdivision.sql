-- Phase 1 only. Run manually in Supabase SQL Editor as the project owner.
-- Based on supplied metadata captured 2026-09-19 18:31:20 UTC.
-- Does not yet implement Staff/Accounts/Manager data separation.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Stop rather than change an unexpectedly different policy configuration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_type = 'admin' AND status IS DISTINCT FROM 'inactive'
  ) THEN
    RAISE EXCEPTION 'No enabled admin profile found. Review profiles before applying.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND cmd IN ('UPDATE', 'ALL')
      AND policyname NOT IN ('self_update_profiles', 'admin_update_profiles')
  ) THEN
    RAISE EXCEPTION 'Unexpected profile UPDATE policy. Obtain fresh metadata first.';
  END IF;
END $$;

ALTER TABLE public.admin ADD COLUMN IF NOT EXISTS subdivision text;

-- No public/anonymous access is needed for these internal CRM tables.
REVOKE ALL PRIVILEGES ON TABLE
  public.admin, public.profiles, public.metadata, public.activity_log
  FROM anon, PUBLIC;

-- RLS does not protect TRUNCATE. These privileges are unnecessary for clients.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.admin, public.profiles, public.metadata, public.activity_log
  FROM authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS self_update_profiles ON public.profiles;
DROP POLICY IF EXISTS admin_update_profiles ON public.profiles;
CREATE POLICY admin_update_profiles ON public.profiles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS actor
    WHERE actor.id = (SELECT auth.uid())
      AND actor.user_type = 'admin'
      AND actor.status IS DISTINCT FROM 'inactive'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles AS actor
    WHERE actor.id = (SELECT auth.uid())
      AND actor.user_type = 'admin'
      AND actor.status IS DISTINCT FROM 'inactive'
  )
);

COMMIT;

-- Structural verification. Expected: true, false, false, false.
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='admin'
            AND column_name='subdivision' AND data_type='text') AS subdivision_exists,
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
          AND tablename='profiles' AND policyname='self_update_profiles') AS self_update_still_exists,
  has_table_privilege('anon', 'public.admin', 'SELECT') AS anon_can_select_admin,
  has_table_privilege('authenticated', 'public.admin', 'TRUNCATE') AS authenticated_can_truncate;
