# Backup, keep-alive and release setup

## GitHub secrets the owner must configure

In powertronicstechnology/CRM → Settings → Secrets and variables → Actions:

| Secret | Value |
| --- | --- |
| SUPABASE_URL | Project URL, https://PROJECT.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | Server-only legacy service-role key for the metadata health request |
| SUPABASE_DB_URL | Connect → Session pooler Postgres URI on port 5432, with the database password URL-encoded; use sslmode=require |
| BACKUP_REPO | owner/repository of the existing **private** backup repository |
| BACKUP_PAT | Token with repository read/write contents and metadata access to that backup repository only |
| BACKUP_PASSPHRASE | Long random single-line passphrase, at least 32 characters; keep an independent copy in a password manager |
| VITE_SUPABASE_URL | Public project URL for the frontend (falls back to SUPABASE_URL) |
| VITE_SUPABASE_ANON_KEY | Public anon key for the frontend (falls back to SUPABASE_ANON_KEY); never a service-role key |

Do not send these values in chat or commit them. The existing backup job may already have some secrets; two additions are SUPABASE_DB_URL and BACKUP_PASSPHRASE. The backup repository must have an initialized default branch. Keep old CSV backups private; this change does not delete historical copies.

## What the jobs do

- Supabase Keep Alive: 08:30 IST daily. An authorized metadata query returns at most one identifier, which is never printed. This checks database reachability and creates activity; it is not a guarantee against free-tier suspension or an uptime SLA. A paused project must be restored by its owner.
- Daily Supabase Backup: 01:30 IST daily. Verifies private destination and write access; uses pinned Supabase CLI 2.101.0 to dump roles, application schema and data (including supported Auth/Storage data); archives with a manifest/checksums; encrypts with GPG AES256; decrypts locally to verify byte integrity; only then commits encrypted files and a ciphertext checksum.
- Dump failures, missing expected CRM content, failed encryption, oversized archives (>90 MiB), and failed pushes fail the job. No CSV API row limits or pagination are involved.
- Plaintext temporary files are removed when the script exits. Only encrypted .gpg and .sha256 files go to the backup repository. Retention is currently all successful snapshots; watch repository growth and move to private object storage before approaching limits.
- Three sequential CLI dumps are not one cross-file transactional snapshot; schedule during quiet periods and avoid schema migrations during the backup window.
- The backup does not include Storage file bytes, project configuration/secrets, or Edge Function deployments. Custom auth/storage schema changes need separate migrations. Vector bucket/index tables are excluded per the current Supabase restore guide. Preserve the CRM source repository (including crm_private migrations and add_user source) alongside backups. Vault/encrypted-column recovery requires the additional steps in the official guide.

## First live verification — owner runs

1. Apply the two-role SQL patch (already reported done) and redeploy the updated `supabase/functions/add_user/index.ts` in Supabase. Keep JWT verification enabled.
2. Set the GitHub secrets above.
3. GitHub → Actions → Supabase Keep Alive → Run workflow. Confirm green.
4. Actions → Daily Supabase Backup → Run workflow. Confirm green and a new .gpg plus .sha256 file in the private backup repository. Check both commit and timestamp; a green workflow alone is not a restore test.
5. Enable GitHub failure notifications and verify scheduled runs the following day. GitHub schedules can be delayed or disabled; inspect last successful run regularly.

## Restore rehearsal — isolated project only

No restore has been performed against the hosted database. Create a separate empty Supabase test project; never use the production connection URI for a rehearsal. Keep source/target credentials clearly separated.

Download one encrypted archive and its checksum to a private local folder. Run:

```sh
shasum -a 256 -c SNAPSHOT.tar.gz.gpg.sha256
gpg --output database.tar.gz --decrypt SNAPSHOT.tar.gz.gpg
mkdir restore-files
tar -xzf database.tar.gz -C restore-files
```

GPG asks for the passphrase interactively. Compare extracted files against SHA256 hashes in manifest.json. Then follow the official restore guide below for your Supabase/Postgres versions, extensions, managed roles, auth/storage customizations and any encryption keys. Its baseline import, using the **test** project's connection URI in TEST_DATABASE_URL, is:

```sh
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file restore-files/roles.sql \
  --file restore-files/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file restore-files/data.sql \
  --dbname "$TEST_DATABASE_URL"
```

Managed-role conflicts may need the specific adjustments in the official guide; do not ignore arbitrary SQL errors. Verify all CRM table counts against the source snapshot, representative records and balances, profiles/Auth users, `crm_private` functions, RLS/grants, and test Admin/Staff access using the test project's frontend. Restore/redeploy versioned functions and configuration separately. Record restore date, archive name, row counts, failures and resolution. Only then mark recovery verified.

Reference: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Verification performed here

Local unit tests cover private-repository checks, authorized health request behavior, failed dump handling, encryption-integrity failure handling and publication of ciphertext only. Subprocesses are mocked in these tests; they are not a real Supabase dump, cryptographic test or database restore. Production build and CRM access/export tests are also run. Live workflow success and restore capability remain unverified until the owner completes the steps above.
