-- ============================================
-- ABSOLUTE FINAL FIX - START FROM SCRATCH
-- ============================================
-- We're going to:
-- 1. Disable RLS temporarily
-- 2. Drop ALL policies
-- 3. Re-enable RLS
-- 4. Create the SIMPLEST possible policies

-- STEP 1: Disable RLS temporarily to clear everything
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies (nuclear option)
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop all rooms policies
  FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rooms') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rooms', pol.policyname);
  END LOOP;

  -- Drop all room_members policies
  FOR pol IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'room_members') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.room_members', pol.policyname);
  END LOOP;
END $$;

-- STEP 3: Re-enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create ULTRA-SIMPLE policies

-- ROOMS POLICIES
-- Insert: Just check the user matches created_by
CREATE POLICY "rooms_insert"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Select: For now, let authenticated users see rooms they created
-- (we'll fix this after room creation works)
CREATE POLICY "rooms_select"
ON public.rooms
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Update: Only creator can update
CREATE POLICY "rooms_update"
ON public.rooms
FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Delete: Only creator can delete
CREATE POLICY "rooms_delete"
ON public.rooms
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- ROOM_MEMBERS POLICIES
-- Insert: User can only add themselves
CREATE POLICY "room_members_insert"
ON public.room_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Select: See your own memberships only (no recursion!)
CREATE POLICY "room_members_select"
ON public.room_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Update: Update your own membership
CREATE POLICY "room_members_update"
ON public.room_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Delete: Delete your own membership
CREATE POLICY "room_members_delete"
ON public.room_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());