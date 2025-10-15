-- Check what's ACTUALLY in the database right now
-- 1. Is RLS enabled?
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('rooms', 'room_members');

-- 2. What policies exist on rooms?
SELECT
  policyname,
  cmd,
  roles::text,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'rooms'
ORDER BY policyname;

-- 3. What policies exist on room_members?
SELECT
  policyname,
  cmd,
  roles::text,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'room_members'
ORDER BY policyname;