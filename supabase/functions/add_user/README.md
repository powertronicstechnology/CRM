# add_user

Local source for the user-management Edge Function. Derived from the supplied source and now updated for Staff, Accounts, Manager and Admin. No hosted deployment has been performed.

The current version validates the bearer token, requires a current active Admin profile for every action, assigns canonical role labels server-side, validates new account inputs and avoids logging request bodies/passwords. It awaits password-reset email completion and returns a warning when sending fails. The matching database migration protects the last active Admin.

The function reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from server environment variables. No credential values are committed here. JWT verification remains enabled in supabase/config.toml.

Follow [the coordinated rollout](../../../docs/four-role-rollout.md); the new role constraint and function must be released together. The local CLI project_id is not a confirmed hosted project reference.

Remaining follow-ups: Auth email updates and profile email updates are not one atomic operation; reconcile partial failures. Production email delivery and JWT gateway configuration require verification after deployment.
