-- ============================================
-- ENSURE TRIGGER BYPASSES RLS
-- ============================================
-- The trigger that adds room creator as member needs SECURITY DEFINER

-- Drop and recreate the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- This makes it run as the function owner (bypasses RLS)
SET search_path = public, auth  -- Set search path for security
AS $$
BEGIN
  -- Add the room creator as an owner member
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_room_created ON public.rooms;
CREATE TRIGGER on_room_created
AFTER INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_room();