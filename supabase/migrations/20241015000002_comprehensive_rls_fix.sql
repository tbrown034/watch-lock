-- ============================================
-- COMPREHENSIVE RLS FIX FOR ROOMS AND ROOM_MEMBERS
-- ============================================
-- The issue: RLS is blocking room creation
-- This could be either the rooms INSERT policy OR the room_members INSERT
-- policy that's triggered by the handle_new_room() function

-- Step 1: Fix the rooms INSERT policy (make it super simple)
DROP POLICY IF EXISTS "rooms_insert_policy" ON public.rooms;

CREATE POLICY "rooms_insert_policy"
ON public.rooms FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Step 2: Ensure room_members INSERT policy allows the trigger
-- The handle_new_room() trigger needs to insert a room_member
DROP POLICY IF EXISTS "Users can insert themselves as members" ON public.room_members;
DROP POLICY IF EXISTS "room_members_insert_policy" ON public.room_members;

CREATE POLICY "room_members_insert_policy"
ON public.room_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Step 3: Verify the trigger function has SECURITY DEFINER
-- (This allows it to bypass RLS)
CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator as the owner
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Verify the trigger exists
DROP TRIGGER IF EXISTS on_room_created ON public.rooms;
CREATE TRIGGER on_room_created
AFTER INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_room();
