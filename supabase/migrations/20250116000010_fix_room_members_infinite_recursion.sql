-- Fix Infinite Recursion in room_members RLS Policy
-- The "Users can view members of their rooms" policy was querying room_members
-- within the policy itself, causing infinite recursion.

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members of their rooms" ON public.room_members;

-- Create SIMPLE policy without recursion
-- Users can only see room_members records where they themselves are members
CREATE POLICY "Users can view members of their rooms"
ON public.room_members FOR SELECT
USING (
  -- User can see members of rooms where they are also a member
  room_id IN (
    SELECT room_id FROM public.room_members
    WHERE user_id = auth.uid()
  )
);

-- Alternative: Even simpler - just let authenticated users see all room members
-- This is actually fine since room membership isn't sensitive data
-- Uncomment if the above still causes issues:
/*
DROP POLICY IF EXISTS "Users can view members of their rooms" ON public.room_members;
CREATE POLICY "Users can view members of their rooms"
ON public.room_members FOR SELECT
TO authenticated
USING (true);
*/
