# Four-role rollout

Status: implemented and tested locally. No hosted database, function or website changes have been made by Codex. The user applies all Supabase changes.

| Role | Customer/project information | Finance/payment information | Activity log, users, Trash |
| --- | --- | --- | --- |
| Staff | Read/write all active customer records; create leads | Only read-only quotation, receipt and subsidy-date summaries from the requested customer-sheet list | No |
| Accounts | Customer name, CRN and record identity needed to match payments | Read/write across all active records | No |
| Manager | Read/write and create leads | Read/write | No |
| Admin | All, including trashed records | All | Yes |

Accounts cannot create customer records or change names, addresses, stages or installation details. Manager cannot manage users, view activity logs or delete records. Metadata dropdown additions remain available to enabled users; metadata edits/deletion are Admin-only. Anonymous, inactive, missing-profile and unsupported-role callers are rejected. Passwords and service-role keys are never placed in the frontend.

## Coordinated release

**Do not apply the role SQL as an isolated change while expecting the old website to keep working.** It revokes direct `public.admin` access and replaces that access with the checked `crm_records` RPC. The existing live frontend uses direct queries and will fail until the matching frontend is published.

1. Have a recoverable database backup and the current frontend/function versions available before starting the release window.
2. Confirm the reported account inventory is still one active Admin. The migration deliberately stops if legacy types such as office/agent remain; it never guesses a role or deletes an account. Existing Admin receives the Admin label. Do not rerun the older partner-removal migration after this migration.
3. User applies `supabase/migrations/20260919192428_four_role_permissions.sql` in SQL Editor. Its verification should return `direct_record_read=false`, `anonymous_record_read=false`, `authenticated_rpc=true`.
4. User deploys the revised `supabase/functions/add_user/index.ts`, retaining JWT verification. This version verifies a current active Admin and accepts exactly staff/accounts/manager/admin with canonical labels. It awaits the password-reset email request and reports a warning if email sending fails.
5. Publish the matching frontend from this checkout. Do not publish the old tracked dist directory: rebuild first. Do not run the earlier two-role function or SQL after this release.
6. Sign in as Admin, create one test account for each remaining role, and verify allowed/denied screens, editing, role changes, disabling accounts and password setup. Share the SQL result and any errors. Test the deployed API with those sessions too; owner SQL Editor queries are not RLS tests.

If the website release fails after SQL succeeds, repair/publish the matching frontend before reopening access. Do not restore the old broad table grants or self-update policy as a workaround.

## Enforcement

`public.admin` retains the original records. Raw client table access and the old permissive policies are removed. `public.crm_records` is a SECURITY INVOKER wrapper around a narrowly scoped implementation in `crm_private`. Its SECURITY DEFINER implementation is intentional: it checks `auth.uid()` and the current enabled profile on every call, applies explicit read/write field allowlists, rejects unknown fields/actions, binds payload values and returns only permitted columns. It cannot be used to impersonate another user or request a different role. Keep `crm_private` out of the exposed API schemas.

Profiles are readable by their owner and by Admin. Only Admin can change role labels/types through the client; status/email changes use the verified Admin Edge Function. A database trigger prevents removing or disabling the last active Admin, including through service-role operations. Activity reads are Admin-only; client log inserts must use the caller's user ID. Record mutations also create database-side activity entries. Client log text remains user-supplied and should not be treated as independently verified history.

The UI refreshes profile permissions and records every 30 seconds and on window focus. The server checks current permissions immediately on every request. Realtime direct-table subscriptions were removed so they cannot become a second data-delivery path. Already viewed information cannot be retroactively recalled from a browser.

## Validation and limits

- `node --test tests/*.test.mjs` covers role admission, frontend navigation/detail visibility, Edge Function authorization/role creation, and the SQL against a local PostgreSQL-compatible PGlite database constructed from the supplied schema/policies/triggers.
- SQL tests include cross-role reads/writes, forbidden fields, direct table access, unknown fields, anonymous/inactive sessions, self-promotion, log spoofing, Trash/restore and last-Admin protection.
- Production build passes. No hosted Supabase, Deno deployment, browser login or email delivery tests have been run for this revision.
- The two existing quotation formulas remain a separate unresolved issue. This migration limits the financial-sync trigger to financial changes so CRM-only edits do not recalculate balances. It does not choose a new authoritative quotation or rewrite existing balances.
- The two-tab Excel export and further laptop layout work remain separate pending tasks. Current CSV export receives only the role-filtered records; unavailable fields are empty.
