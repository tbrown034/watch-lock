-- Check what RLS policies are actually on the rooms table right now
SELECT
  policyname,
  cmd,
  roles::text[]
FROM pg_policies
WHERE tablename = 'rooms'
ORDER BY cmd, policyname;
