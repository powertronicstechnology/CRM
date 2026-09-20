# CRM password reset rollout

The reset page is `/CRM/?reset_password=1`. The query parameter avoids conflicts between HashRouter and Supabase's recovery-token fragment, and does not require a physical GitHub Pages subpage.

Owner steps:
1. Supabase Authentication → URL Configuration: Site URL `https://powertronicstechnology.github.io/CRM/`.
2. Add Redirect URLs `https://powertronicstechnology.github.io/CRM/?reset_password=1` and, for local testing, `http://localhost:5173/CRM/?reset_password=1`.
3. Deploy frontend changes before requesting a fresh email. Old links to watersun9 cannot be repaired by this code.
4. Redeploy add_user when using its admin reset-email operation; its redirect has also been updated locally.
5. Request a fresh reset email, open it, enter and confirm a new password, then choose Go to login. Verify an expired link offers a new-link path.

No live emails sent, no password changed, and no Supabase configuration changed during local verification.
