-- Fix Game/Room Relationship
-- Change from: game belongs to room (games.room_id)
-- Change to: room belongs to game (rooms.game_id)
-- This allows multiple rooms per game (correct MVP architecture)

-- Step 1: Drop all policies that depend on games.room_id OR need to be recreated
DROP POLICY IF EXISTS "Room members can create games" ON public.games;
DROP POLICY IF EXISTS "Users can view progress in their games" ON public.progress_markers;
DROP POLICY IF EXISTS "Room members can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view games in their rooms or by external_id" ON public.games;
DROP POLICY IF EXISTS "Users can view games in their rooms" ON public.games;
DROP POLICY IF EXISTS "Game creators can update games" ON public.games;
DROP POLICY IF EXISTS "Authenticated users can create games" ON public.games;

-- Step 2: Add game_id column to rooms table
ALTER TABLE public.rooms
ADD COLUMN game_id UUID REFERENCES public.games(id) ON DELETE CASCADE;

-- Step 3: Migrate existing data
-- For each room, find its associated game and link it
UPDATE public.rooms r
SET game_id = g.id
FROM public.games g
WHERE g.room_id = r.id;

-- Step 4: Drop the old room_id column from games
ALTER TABLE public.games
DROP COLUMN room_id;

-- Step 5: Make game_id NOT NULL (after data migration)
ALTER TABLE public.rooms
ALTER COLUMN game_id SET NOT NULL;

-- Step 6: Add index for fast game lookups
CREATE INDEX IF NOT EXISTS idx_rooms_game_id ON public.rooms(game_id);

-- Step 7: Add unique constraint on games.external_id to prevent duplicates
-- First, remove duplicate games (keep the oldest one for each external_id)
DELETE FROM public.games g1
WHERE EXISTS (
  SELECT 1
  FROM public.games g2
  WHERE g2.external_id = g1.external_id
  AND g2.created_at < g1.created_at
);

-- Then add the unique constraint
ALTER TABLE public.games
ADD CONSTRAINT games_external_id_unique UNIQUE (external_id);

-- Step 8: Recreate RLS policies to reflect new relationship
-- New game policies: Users can view games if they're in ANY room for that game
CREATE POLICY "Users can view games in their rooms"
ON public.games FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.room_members rm ON rm.room_id = r.id
    WHERE r.game_id = games.id
    AND rm.user_id = auth.uid()
  )
  -- OR allow querying by external_id (needed for room creation)
  OR external_id IS NOT NULL
);

-- Any authenticated user can create games (for new MLB/NFL games)
CREATE POLICY "Authenticated users can create games"
ON public.games FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Game creators can update their games
CREATE POLICY "Game creators can update games"
ON public.games FOR UPDATE
USING (auth.uid() = created_by);
