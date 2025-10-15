-- ============================================
-- FIX: Add TO authenticated to RLS Policies
-- ============================================
-- Root cause: Previous migration dropped and recreated policies
-- without specifying TO authenticated, causing them to apply
-- to the 'public' role instead of 'authenticated' role.
--
-- This prevented authenticated users from creating rooms.

-- Drop the broken policies
DROP POLICY IF EXISTS "rooms_insert_policy" ON public.rooms;
DROP POLICY IF EXISTS "room_members_insert_policy" ON public.room_members;

-- Recreate with TO authenticated properly specified
CREATE POLICY "rooms_insert_policy"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "room_members_insert_policy"
ON public.room_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
