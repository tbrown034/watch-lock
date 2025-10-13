-- ============================================
-- FIX ROOMS INSERT POLICY
-- ============================================
-- The rooms INSERT policy needs to allow authenticated users to create rooms
-- The issue is that the trigger adds the room member AFTER the room is created,
-- but some policies might be checking membership

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;

-- Recreate with proper check
CREATE POLICY "Authenticated users can create rooms"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- Also ensure the UPDATE policy is correct
DROP POLICY IF EXISTS "Room owners can update their rooms" ON public.rooms;

CREATE POLICY "Room owners can update their rooms"
ON public.rooms FOR UPDATE
TO authenticated
USING (created_by = auth.uid());
