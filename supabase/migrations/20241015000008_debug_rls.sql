-- ============================================
-- DEBUG: Temporarily simplify RLS to test
-- ============================================

-- Drop existing INSERT policy on rooms
DROP POLICY IF EXISTS "rooms_insert" ON public.rooms;

-- Create a DEBUG policy that always allows authenticated users
-- This is TEMPORARY just to test if auth.uid() is working
CREATE POLICY "rooms_insert_debug"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (true);  -- Allow ALL authenticated inserts temporarily

-- Also add a simple logging comment
COMMENT ON POLICY "rooms_insert_debug" ON public.rooms IS 'TEMPORARY DEBUG - allows all authenticated inserts';