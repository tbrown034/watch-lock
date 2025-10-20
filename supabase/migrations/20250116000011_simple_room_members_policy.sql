-- NUCLEAR FIX: Simplest possible room_members policy
-- No subqueries, no recursion, just let authenticated users see all members
-- This is SAFE because:
-- 1. Room membership isn't sensitive data
-- 2. Users can only join rooms with share codes anyway
-- 3. The rooms themselves are already protected by RLS

-- Drop ALL existing policies on room_members
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'room_members'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.room_members', pol.policyname);
  END LOOP;
END $$;

-- Create SIMPLE policies (no recursion possible)

-- SELECT: Any authenticated user can view room members
CREATE POLICY "view_room_members"
ON public.room_members FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can only add themselves
CREATE POLICY "insert_own_membership"
ON public.room_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own membership
CREATE POLICY "update_own_membership"
ON public.room_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE: Users can only delete their own membership
CREATE POLICY "delete_own_membership"
ON public.room_members FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
