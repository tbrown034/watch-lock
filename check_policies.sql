-- Check all policies on rooms table
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'rooms'
ORDER BY policyname;
