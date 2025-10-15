-- Check current RLS policies on rooms table
SELECT
  tablename,
  policyname,
  cmd,
  roles::text,
  CASE
    WHEN qual IS NOT NULL THEN pg_get_expr(qual, 'public.rooms'::regclass)
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN pg_get_expr(with_check, 'public.rooms'::regclass)
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename = 'rooms'
ORDER BY policyname;
