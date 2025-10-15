-- ============================================
-- NUCLEAR OPTION: Completely Reset RLS Policies
-- ============================================
-- Previous migrations didn't work. Start completely fresh.
-- This drops EVERYTHING and creates the simplest possible policies.

-- Step 1: Drop ALL policies on rooms (all possible names from all migrations)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.rooms';
  END LOOP;
END $$;

-- Step 2: Create ultra-simple INSERT policy
-- Any authenticated user can insert if they set themselves as creator
CREATE POLICY "allow_authenticated_insert_rooms"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Step 3: SELECT policy - see rooms you're a member of
CREATE POLICY "allow_select_own_rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = rooms.id
    AND room_members.user_id = auth.uid()
  )
);

-- Step 4: UPDATE policy - only room creator
CREATE POLICY "allow_update_own_rooms"
ON public.rooms
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Step 5: DELETE policy - only room creator
CREATE POLICY "allow_delete_own_rooms"
ON public.rooms
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Verify RLS is enabled
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Now fix room_members policies the same way
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'room_members') LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.room_members';
  END LOOP;
END $$;

CREATE POLICY "allow_insert_room_members"
ON public.room_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_select_room_members"
ON public.room_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "allow_update_own_membership"
ON public.room_members
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "allow_delete_room_members"
ON public.room_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = room_members.room_id
    AND rooms.created_by = auth.uid()
  )
  OR auth.uid() = user_id
);
