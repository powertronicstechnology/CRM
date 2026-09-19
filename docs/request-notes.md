# CRM request — 19 September 2026

Site: https://powertronicstechnology.github.io/CRM/

Requested now: Application No and Subdivision; investigate reported “couldn't find total count in admin schema” error; inspect database structure and RLS.

Observed: admin dashboard loads with 191 active records. No console errors on initial dashboard. Application No already exists in customer details as `application_no`; export previously used `application_number`. Both lead creation forms send `total_cost`; whether that column exists remains unverified. Supabase connector returned USER_NOT_LOGGED_IN.

Local changes: added Application No and Subdivision to both lead forms, Subdivision to customer details and model, corrected Application No export with legacy fallback and included Subdivision. No production deployment or database changes made. Verify `public.admin.application_no` and `public.admin.subdivision` exist and have suitable text types before deployment; preserve leading zeros in identifiers. Do not guess a migration until metadata is available.

Run database-inspection.sql in Supabase SQL Editor and export its complete result, or connect Supabase for direct inspection. The SQL collects metadata only; definitions can contain embedded configuration. It does not establish which schemas the project's Data API exposes, or verify actual role access with authenticated users. Those checks remain necessary for the RLS review.

## Column list saved for later discussion (original names/order)

1. SR. NO
2. NAME
3. STATUS
4. METER PHASE
5. ADDRESS
6. AREA
7. MOBILE NO
8. SYSTEM IN KW
9. PANEL
10. INVERTER
11. CONSUMER NUMBER
12. APPLICATION NO
13. QUOTATION AMOUNT
14. DATE OF REGISTRATION
15. PAYMENT RECEIPT
16. FABRICATION AND WIRING
17. PANEL AND INVERTER
18. METER FILE SUBMISSION
19. METER INSTALED
20. SUBSIDY CLAIM
21. SUBSIDY RECEIVED
22. FILE GIVEN TO CUSTOMER
23. Column 1
24. Column 2
25–29. Five unnamed columns

Subdivision was requested separately. The full list is recorded only, not implemented.

Validation: npm ci --ignore-scripts and npm run build succeeded; git diff --check passed. npm reported 10 dependency vulnerabilities (2 low, 4 moderate, 4 high); dependency remediation was not performed. Generated build artifacts were restored after validation. Database query has not yet been executed against the project.

## Revised requirements — 20 September 2026

- Completed means stage `SUBSIDY AMOUNT DISBURSED`. Updated local dashboard counts accordingly.
- Customer/financial separation means separate Excel workbook tabs, not new CRM screens.
- Replace the old dealer/channel-partner login model with staff access levels: CRM only, Finance only, and both. Admin has full access, including activity logs and user management. Clarification pending: whether Staff Admin is a separate fifth role.
- Earlier permission to let all staff see all customer/financial records is superseded by these access levels.
- Laptop-focused interface requested; clarification pending whether phone-sized screens should also be blocked. Screen size is not proof of device type.
- Supplied schema confirms `application_no` exists, `subdivision` and `total_cost` do not. Removed the unsupported `total_cost` write from AddLeadModal.
- Security finding: self_update_profiles permits self-editing user_type; authenticated users can currently read and update all admin rows regardless of business role or inactive status. Database enforcement must accompany UI role changes.
- Current data is in one public.admin table. RLS filters rows, not columns. CRM/Finance separation requires column-level privileges with carefully scoped access paths or separate protected tables. Do not ship UI-only restrictions.
- ExcelJS 4.4.0 installed for browser export; a CLI-created migration file exists but has not been populated or applied. No production changes made.

## Security handoff — 20 September 2026

The later uploaded metadata is identical to the first snapshot. User will supply/run all Supabase work; do not use Supabase connections. Phase-1 SQL is prepared in supabase/migrations/20260919183528_admin_staff_subdivision.sql and is unexecuted. Details in docs/security-review.md. Four-role implementation and Excel export are still pending; do not describe them as complete. Current agreed names: Staff, Accounts, Manager, Admin. Laptop optimization only, no phone blocking.

## Partner removal — local changes

Removed the partner role, AgentForm file/routing, and partner/vendor registration side effects. Login and restored sessions accept active admin/office profiles only. Corrected Office user_type from sales to office to match the current database. The local add_user function now requires a verified active Admin, rejects unsupported creation types, uses canonical labels and no longer logs passwords. Manual SQL migration remove_partner_access constrains roles and labels without deleting records; it stops if unexpected accounts exist. Historical metadata is retained but no app code consumes or creates the obsolete categories. Four-role permissions, Excel export and production deployment remain pending.

## Four-role implementation — local, not deployed

Staff/Accounts/Manager/Admin implemented in frontend and add_user. Coordinated SQL is 20260919192428_four_role_permissions.sql; see docs/four-role-rollout.md for permissions, validation and required release order. Supersedes prior notes that four-role coding is pending. User-reported phase-1 patch application is accepted; production verification not yet supplied. New four-role migration has not been applied. CSV remains current export; two-tab Excel and further laptop layout changes remain pending.

## Authoritative working checkout

At the user's request, conversation changes were merged with a three-way Git patch into `/Users/mahvishsadafv2/Desktop/solar-copy1`. Its source matched GitHub main at 02b9661 before the merge; existing differences were generated dist files only. Its .env and pre-existing dist modifications were preserved and excluded from the conversation commit. Use solar-copy1 for subsequent work. The Documents checkout is the earlier working copy, not the release target.
