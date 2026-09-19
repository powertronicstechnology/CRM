-- Run in the project's Supabase SQL Editor. One JSON result, read-only.
-- Includes every non-system schema (including auth/storage), but no table rows.
-- Definitions/defaults may contain embedded configuration: review before sharing.
WITH schemas AS (
  SELECT oid, nspname, nspowner, nspacl
  FROM pg_namespace
  WHERE nspname <> 'information_schema' AND nspname !~ '^pg_'
), relations AS (
  SELECT c.*, n.nspname
  FROM pg_class c JOIN schemas n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
)
SELECT jsonb_pretty(jsonb_build_object(
  'captured_at', now(),
  'schemas', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'name', nspname, 'owner', pg_get_userbyid(nspowner), 'acl', nspacl
  ) ORDER BY nspname) FROM schemas), '[]'::jsonb),
  'relations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'schema', r.nspname, 'name', r.relname, 'kind', r.relkind,
    'owner', pg_get_userbyid(r.relowner), 'rls_enabled', r.relrowsecurity,
    'rls_forced', r.relforcerowsecurity, 'acl', r.relacl,
    'options', r.reloptions,
    'view_definition', CASE WHEN r.relkind IN ('v','m') THEN pg_get_viewdef(r.oid, true) END,
    'columns', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'position', a.attnum, 'name', a.attname,
      'type', format_type(a.atttypid, a.atttypmod), 'nullable', NOT a.attnotnull,
      'default', pg_get_expr(d.adbin, d.adrelid),
      'identity', a.attidentity, 'generated', a.attgenerated, 'acl', a.attacl
    ) ORDER BY a.attnum)
      FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=r.oid AND a.attnum>0 AND NOT a.attisdropped), '[]'::jsonb),
    'constraints', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'name', conname, 'definition', pg_get_constraintdef(oid, true)
    ) ORDER BY conname) FROM pg_constraint WHERE conrelid=r.oid), '[]'::jsonb),
    'indexes', COALESCE((SELECT jsonb_agg(pg_get_indexdef(indexrelid) ORDER BY indexrelid)
      FROM pg_index WHERE indrelid=r.oid), '[]'::jsonb),
    'triggers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'name', tgname, 'enabled', tgenabled, 'definition', pg_get_triggerdef(oid, true)
    ) ORDER BY tgname) FROM pg_trigger WHERE tgrelid=r.oid AND NOT tgisinternal), '[]'::jsonb)
  ) ORDER BY r.nspname, r.relname) FROM relations r), '[]'::jsonb),
  'policies', COALESCE((SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname, tablename, policyname)
    FROM pg_policies p WHERE schemaname IN (SELECT nspname FROM schemas)), '[]'::jsonb),
  'functions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'schema', n.nspname, 'name', p.proname,
    'arguments', pg_get_function_identity_arguments(p.oid),
    'owner', pg_get_userbyid(p.proowner), 'security_definer', p.prosecdef,
    'config', p.proconfig, 'acl', p.proacl, 'definition', pg_get_functiondef(p.oid)
  ) ORDER BY n.nspname, p.proname, p.oid)
    FROM pg_proc p JOIN schemas n ON n.oid=p.pronamespace
    WHERE p.prokind IN ('f', 'p')), '[]'::jsonb),
  'default_privileges', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'owner', pg_get_userbyid(d.defaclrole), 'schema', n.nspname,
    'object_type', d.defaclobjtype, 'acl', d.defaclacl
  )) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace), '[]'::jsonb),
  'roles', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'name', rolname, 'superuser', rolsuper, 'inherit', rolinherit,
    'bypass_rls', rolbypassrls, 'can_login', rolcanlogin
  ) ORDER BY rolname) FROM pg_roles), '[]'::jsonb),
  'role_memberships', COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'role', pg_get_userbyid(roleid), 'member', pg_get_userbyid(member), 'admin_option', admin_option
  )) FROM pg_auth_members), '[]'::jsonb)
)) AS database_metadata;
