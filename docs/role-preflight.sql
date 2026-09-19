-- Read-only. Share this result to plan the existing-account migration.
-- No email addresses, passwords, names or tokens are returned.
SELECT user_type, role, status, count(*) AS account_count
FROM public.profiles
GROUP BY user_type, role, status
ORDER BY user_type, role, status;
