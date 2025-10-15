-- Check what policies actually exist on rooms table
SELECT
  policyname,
  cmd,
  roles::text[],
  permissive,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'rooms'
ORDER BY policyname;

-- Also check if RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'rooms';
