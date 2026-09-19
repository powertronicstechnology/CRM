# Database review — 20 September 2026

The two supplied metadata files are identical, including captured_at. This is an inspection of that snapshot, not evidence that production has changed. No Supabase connection or database changes were performed for this review.

## Confirmed findings

1. **Self-promotion:** `self_update_profiles` permits an authenticated user to update their own entire profile, including `user_type`, `role`, and `status`. The permissive admin policy does not restrict that separate policy. The phase-1 patch removes self-updates and allows profile changes only by enabled admins.
2. **No business-role isolation:** `admin` SELECT, INSERT and UPDATE permit all authenticated users. Staff, Accounts and Manager are not distinguished. Disabled profiles are not checked on these operations. UI restrictions are insufficient.
3. **Excess grants:** all four public tables grant anon/authenticated broad privileges, including TRUNCATE. RLS is enabled on all four tables; the grants alone do not establish anonymous row exposure. Revoke unnecessary grants and retain/test only needed operations.
4. **Activity visibility and integrity:** any authenticated account can read activity_log and insert a row with another user_id. Restrict reads to Admin and inserts to the caller's user ID. For dependable audit trails, generate events in database triggers rather than trusting client-provided messages.
5. **Conflicting financial calculations:** `trg_admin_financial_sync` uses quoted_amount_3 and floors receivables at zero. `trg_update_admin_totals` uses quoted_amount and permits negative receivables. Both run on insert and some updates; the latter trigger runs after the former for the same event, overriding the balance. Decide the authoritative quotation and overpayment treatment before merging these triggers. No automatic recalculation has been performed.
6. **Schema mismatches:** `application_no` exists; `subdivision` and `total_cost` do not. The frontend also writes stage_remarks while the table has stages_remarks. The table has both subsidy_recieved and subsidy_received, and both meter_instaled and meter_installed. Preserve existing data until aliases are reconciled.
7. **Role mismatch:** the profile constraint allows admin/office/agent, while the old UI creates Office using sales. New roles require coordinated constraint, account mapping, frontend and add_user Edge Function updates.

## Agreed target

| Role | Customer/project information | Financial information | Activity log/user management |
| --- | --- | --- | --- |
| Staff | Yes | No, except agreed customer-sheet fields | No |
| Accounts | Minimal customer identifiers needed to match payments | Yes | No |
| Manager | Yes | Yes | No |
| Admin | Yes | Yes | Yes |

The customer export list explicitly includes quotation amount, payment receipt and subsidy dates. This overlap must be reflected consistently in access rules. Exports contain only data the signed-in role may read. Layout is optimized for laptops; phones are not blocked.

## Rollout

1. User runs the phase-1 migration in SQL Editor and shares its verification result. This patch closes self-promotion, removes unnecessary grants and adds Subdivision. It does not finish role separation or block all inactive-user access.
2. User runs role-preflight.sql and shares aggregate counts. Existing account roles must be mapped deliberately; do not silently give dealers Manager access or delete accounts.
3. Review the deployed add_user Edge Function source, including authorization for create, deactivate, reactivate, update-email and delete actions. Metadata does not contain this source. User provides code with secrets removed.
4. Implement the four roles and a database-enforced customer/financial boundary. Prefer separate protected customer and finance tables linked by customer ID, with carefully defined shared identifiers. RLS filters rows, not columns; a policy on the existing combined table alone cannot hide financial columns. Coordinate frontend queries and database migration so the current select('*') client is not stranded.
5. Require a current enabled profile for each permitted operation, protect role/status updates, enforce Admin-only management/deletion, and revoke unnecessary direct access paths. Do not use editable user_metadata for authorization.
6. Test with Admin, Staff, Accounts, Manager, inactive and anonymous sessions: allowed reads/writes, denied cross-domain requests, self-promotion, log spoofing, exports, and old sessions after disabling a user. SQL Editor owner queries alone do not test RLS.

Phase 1 has been reviewed against the supplied schema but has not been executed or tested on a database. The attached verification query checks structure; authenticated role tests remain required. Backup/restore settings, Auth settings, exposed API schemas, Storage configuration, deployed Edge Functions and secrets are outside the supplied snapshot.

References: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/database/postgres/column-level-security
