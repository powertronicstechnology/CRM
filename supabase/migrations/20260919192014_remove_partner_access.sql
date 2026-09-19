-- Run manually in Supabase SQL Editor. No user or customer records are deleted.
-- Transitional role set: admin/office. Four-role permissions follow separately.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.profiles IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles
             WHERE user_type IS NULL OR user_type NOT IN ('admin', 'office')) THEN
    RAISE EXCEPTION 'Unsupported accounts exist. Review them before removing legacy role support; no accounts were changed.';
  END IF;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check
  CHECK (user_type IS NOT NULL AND user_type IN ('admin', 'office'));
UPDATE public.profiles
SET role = CASE user_type WHEN 'admin' THEN 'Admin' ELSE 'Office' END
WHERE role IS DISTINCT FROM CASE user_type WHEN 'admin' THEN 'Admin' ELSE 'Office' END;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_label_check
  CHECK (role IS NOT NULL AND (
    (user_type = 'admin' AND role = 'Admin') OR
    (user_type = 'office' AND role = 'Office')
  ));

COMMIT;

SELECT user_type, role, status, count(*) AS account_count
FROM public.profiles GROUP BY user_type, role, status;
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'public.profiles'::regclass
  AND conname IN ('profiles_user_type_check', 'profiles_role_label_check');
