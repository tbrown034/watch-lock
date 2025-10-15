-- ============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================
-- Problem: room_members SELECT policy was checking room_members table,
-- creating infinite recursion: "Can I select? Let me select to check if I can select..."
--
-- Solution: Simple, direct check without self-reference

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "allow_select_room_members" ON public.room_members;

-- Create simple non-recursive policy
-- Users can see room memberships where they are a member
CREATE POLICY "allow_select_room_members"
ON public.room_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- This means:
-- ✅ You can see your own memberships
-- ✅ No recursion possible (no subqueries)
-- ✅ Fast and simple
-- Note: Users can't see other members in their rooms yet (OK for MVP)