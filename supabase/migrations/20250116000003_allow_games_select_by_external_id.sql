-- Allow users to query games by external_id even if not yet a member
-- This is needed for the room info API which runs BEFORE the user enters the room

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view games in their rooms" ON public.games;

-- New policy: Allow viewing games by external_id OR if user is a room member
CREATE POLICY "Users can view games in their rooms or by external_id"
ON public.games FOR SELECT
USING (
  -- Allow if user is a room member
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = games.room_id
    AND room_members.user_id = auth.uid()
  )
  -- OR allow querying by external_id (needed for room info lookup)
  OR external_id IS NOT NULL
);
