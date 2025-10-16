-- Verify and Fix RLS Policies After Schema Changes
-- This ensures all policies correctly reflect the new schema:
-- - rooms.game_id → games.id (NOT games.room_id)
-- - profiles.display_name (NO username field)

-- ============================================
-- GAMES POLICIES - FIX
-- ============================================

-- Drop old policy that might still reference games.room_id
DROP POLICY IF EXISTS "Users can view games in their rooms or by external_id" ON public.games;
DROP POLICY IF EXISTS "Users can view games in their rooms" ON public.games;

-- NEW: Correct policy using rooms.game_id
CREATE POLICY "Users can view games in their rooms"
ON public.games FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.room_members rm ON rm.room_id = r.id
    WHERE r.game_id = games.id
    AND rm.user_id = auth.uid()
  )
  -- OR allow querying by external_id (needed for room creation flow)
  OR external_id IS NOT NULL
);

-- ============================================
-- ROOMS POLICIES - VERIFY
-- ============================================

-- Drop old ultra-simple policies from absolute_final_fix
DROP POLICY IF EXISTS "rooms_insert" ON public.rooms;
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete" ON public.rooms;

-- Create proper policies
CREATE POLICY "Users can view their rooms"
ON public.rooms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = rooms.id
    AND room_members.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create rooms"
ON public.rooms FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room owners can update their rooms"
ON public.rooms FOR UPDATE
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = rooms.id
    AND room_members.user_id = auth.uid()
    AND room_members.role IN ('owner', 'admin')
  )
);

-- ============================================
-- ROOM_MEMBERS POLICIES - VERIFY
-- ============================================

-- Drop old ultra-simple policies
DROP POLICY IF EXISTS "room_members_insert" ON public.room_members;
DROP POLICY IF EXISTS "room_members_select" ON public.room_members;
DROP POLICY IF EXISTS "room_members_update" ON public.room_members;
DROP POLICY IF EXISTS "room_members_delete" ON public.room_members;

-- Create proper policies
CREATE POLICY "Users can view members of their rooms"
ON public.room_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert themselves as members"
ON public.room_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership"
ON public.room_members FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Room owners can remove members"
ON public.room_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = room_members.room_id
    AND rooms.created_by = auth.uid()
  )
  OR auth.uid() = user_id -- Users can leave rooms themselves
);

-- ============================================
-- PROGRESS_MARKERS POLICIES - VERIFY
-- ============================================

DROP POLICY IF EXISTS "Users can view progress in their games" ON public.progress_markers;

-- NEW: Correct policy using rooms.game_id
CREATE POLICY "Users can view progress in their games"
ON public.progress_markers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.games g
    JOIN public.rooms r ON r.game_id = g.id
    JOIN public.room_members rm ON rm.room_id = r.id
    WHERE g.id = progress_markers.game_id
    AND rm.user_id = auth.uid()
  )
);

-- ============================================
-- MESSAGES POLICIES - VERIFY
-- ============================================

DROP POLICY IF EXISTS "Room members can insert messages" ON public.messages;

-- NEW: Correct policy using rooms.game_id
CREATE POLICY "Room members can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.games g
    JOIN public.rooms r ON r.game_id = g.id
    JOIN public.room_members rm ON rm.room_id = r.id
    WHERE g.id = messages.game_id
    AND rm.user_id = auth.uid()
  )
);
