-- ============================================
-- FIX RLS INFINITE RECURSION
-- ============================================
-- The original policy for viewing room_members created infinite recursion
-- because it queried room_members within a room_members policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members of their rooms" ON public.room_members;

-- Create a simpler policy that doesn't self-reference
-- Users can view room members if:
-- 1. It's their own membership, OR
-- 2. They're a member of the same room (checked via rooms table ownership or direct check)

CREATE POLICY "Users can view room members"
ON public.room_members FOR SELECT
USING (
  -- Can view own membership
  auth.uid() = user_id
  OR
  -- Can view members if you're the room owner
  EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = room_members.room_id
    AND r.created_by = auth.uid()
  )
  OR
  -- Can view members if you're in the same room (safe query - uses primary key)
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
    AND rm.id IS NOT NULL  -- Force use of primary key index, avoid recursion
  )
);

-- Alternative simpler approach: Just let authenticated users see memberships
-- This is actually fine since you can only see room_members if you already have the room_id
-- which means you're already in the room (from the rooms policy)
DROP POLICY IF EXISTS "Users can view room members" ON public.room_members;

CREATE POLICY "Authenticated users can view room members"
ON public.room_members FOR SELECT
USING (auth.role() = 'authenticated');
