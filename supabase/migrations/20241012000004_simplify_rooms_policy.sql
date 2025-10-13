-- ============================================
-- SIMPLIFY ROOMS RLS POLICY
-- ============================================
-- The rooms INSERT policy is still blocking. Let's make it very simple.

-- Drop ALL existing policies on rooms
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Room owners can update their rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view their rooms or public rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view their rooms" ON public.rooms;

-- Create simple, clear policies

-- SELECT: Users can view rooms they're members of
CREATE POLICY "select_own_rooms"
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
CREATE POLICY "insert_rooms"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- UPDATE: Room owners can update
CREATE POLICY "update_own_rooms"
ON public.rooms FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- DELETE: Room owners can delete
CREATE POLICY "delete_own_rooms"
ON public.rooms FOR DELETE
TO authenticated
USING (created_by = auth.uid());
