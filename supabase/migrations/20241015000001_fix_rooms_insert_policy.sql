-- ============================================
-- FIX ROOMS INSERT POLICY - Final Fix
-- ============================================
-- The issue: RLS policy is blocking authenticated users from creating rooms
-- Solution: Explicitly recreate the policy with correct permissions

-- First, drop ALL existing policies on rooms to start fresh
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Room owners can update their rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view their rooms or public rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view their rooms" ON public.rooms;
DROP POLICY IF EXISTS "select_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "insert_rooms" ON public.rooms;
DROP POLICY IF EXISTS "update_own_rooms" ON public.rooms;
DROP POLICY IF EXISTS "delete_own_rooms" ON public.rooms;

-- SELECT: Users can view rooms they're members of
CREATE POLICY "rooms_select_policy"
ON public.rooms FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = rooms.id
    AND room_members.user_id = auth.uid()
  )
);

-- INSERT: Any authenticated user can create a room
-- This is the critical one that was failing
CREATE POLICY "rooms_insert_policy"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = created_by
);

-- UPDATE: Room owners can update their rooms
CREATE POLICY "rooms_update_policy"
ON public.rooms FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- DELETE: Room owners can delete their rooms
CREATE POLICY "rooms_delete_policy"
ON public.rooms FOR DELETE
TO authenticated
USING (created_by = auth.uid());
