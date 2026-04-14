-- ============================================================
-- RLS Verification — Run in Supabase SQL Editor
-- Must return 0 rows. Any row = unprotected table = breach risk.
-- ============================================================

SELECT
  tablename,
  rowsecurity,
  'CRITICAL: RLS is DISABLED' AS warning
FROM pg_tables
WHERE
  schemaname = 'public'
  AND tablename IN (
    'settings', 'trades', 'checklist_logs',
    'profiles', 'trade_images', 'economic_events'
  )
  AND rowsecurity = false
ORDER BY tablename;

-- If any rows returned, run for each:
-- ALTER TABLE public.<tablename> ENABLE ROW LEVEL SECURITY;

-- Then verify policies exist:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
