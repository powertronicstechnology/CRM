# Current mode: Admin and Staff

Admin has all controls. Staff can read/edit all active customer and financial records, create leads, and export both sheets; user management, activity logs and deletion remain Admin-only. Accounts and Manager options are commented out. Their earlier implementation remains in Git and historical migrations for later review.

## Apply together

1. User applies `supabase/migrations/20260920113013_two_role_team_mode.sql` after the existing four-role migration. It stops without changing anything if any other account types exist. Review those accounts and choose their roles explicitly; no automatic conversions are made.
2. User redeploys `supabase/functions/add_user/index.ts`, which now accepts Admin and Staff only.
3. Publish the matching frontend. Until the SQL is applied, the old database permissions still limit Staff finance access.

Local tests verify Staff financial edits and Admin-only restrictions. No hosted changes have been made by Codex. Re-enabling extra roles later requires a coordinated frontend, function and SQL change, not just uncommenting the options.

## Original backup / keep-alive inspection (superseded)

Replacement workflows and owner setup are now documented in [backup-and-restore.md](backup-and-restore.md). The findings below describe the previous implementation.

- `.github/workflows/daily-backup.yml`: configured for 20:00 UTC / 01:30 IST daily. Exports admin, profiles, activity_log and metadata as CSV into the configured backup repository. Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKUP_PAT and BACKUP_REPO secrets.
- This is a partial data snapshot, not a full database recovery backup: no schema, policies, functions, Auth users or Storage objects. Requests lack pagination and HTTP failure checks; activity log requests are explicitly limited to 5,000 and the API may impose a lower row cap. An error response could be saved and committed as a CSV. Repository privacy is assumed by the workflow but not verified.
- `.github/workflows/keep-alive.yml`: configured for 03:00 UTC / 08:30 IST daily. Uses anonymous reads of the admin table. The applied access-hardening patch blocks those reads, so the current workflow is incompatible and needs replacement with an authorized minimal database health check.
- File presence does not establish that GitHub schedules are enabled, secrets are set, recent runs succeeded, or backups can be restored. None of these hosted facts have been verified. The workflows were inspected, not changed or triggered.
- Recommended next step: replace the partial CSV backup with an off-site database dump, validate failures and completeness, verify the destination is private, and test restoration. Check recent GitHub Actions runs. Supabase documents daily managed backups for paid plans and recommends regular off-site CLI dumps for free plans: https://supabase.com/docs/guides/platform/backups . Database backups do not include Storage file contents.
