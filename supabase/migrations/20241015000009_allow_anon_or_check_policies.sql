-- ============================================
-- CHECK WHAT'S ACTUALLY HAPPENING
-- ============================================

-- First, let's see what policies actually exist
DO $$
DECLARE
  pol RECORD;
BEGIN
  RAISE NOTICE 'Current policies on rooms table:';
  FOR pol IN (
    SELECT policyname, cmd, roles::text
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rooms'
  ) LOOP
    RAISE NOTICE '  - % for % to %', pol.policyname, pol.cmd, pol.roles;
  END LOOP;
END $$;

-- Drop the debug policy
DROP POLICY IF EXISTS "rooms_insert_debug" ON public.rooms;

-- Create TWO policies: one for authenticated, one for anon (for testing)
CREATE POLICY "rooms_insert_authenticated"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- TEMPORARY: Also allow anon for testing
CREATE POLICY "rooms_insert_anon_temp"
ON public.rooms
FOR INSERT
TO anon
WITH CHECK (false);  -- Should always fail, but will tell us if anon is being used

-- Let's also check if the roles are what we expect
DO $$
BEGIN
  RAISE NOTICE 'Testing auth context:';
  RAISE NOTICE '  - Current role: %', current_role;
  RAISE NOTICE '  - Session user: %', session_user;
END $$;