-- ============================================
-- WATCHLOCK DATABASE SCHEMA (CURRENT - 2025-01-16)
-- ============================================
-- This reflects the ACTUAL state after all 21 migrations
-- Use this as reference, NOT the old supabase_migration.sql

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Extends auth.users with app-specific data
-- Permanent identifiers: user.id (UUID) and user.email

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT, -- First name from Google OAuth (editable)
  avatar_url TEXT, -- From Google OAuth picture field
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_visited TIMESTAMPTZ
);

COMMENT ON TABLE public.profiles IS
  'User profiles extending auth.users. Permanent identifiers are id (UUID) and email. Display name is editable.';

COMMENT ON COLUMN public.profiles.display_name IS
  'User display name (typically first name from Google OAuth given_name, e.g., "Trevor"). Can be edited by user to any preferred name.';

-- ============================================
-- 2. GAMES TABLE
-- ============================================
-- Specific sporting events (MLB/NBA/NFL)
-- ONE game per external_id (multiple rooms can share same game)

CREATE TABLE IF NOT EXISTS public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sport TEXT CHECK (sport IN ('mlb', 'nba', 'nfl')) DEFAULT 'mlb' NOT NULL,
  title TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  external_id TEXT UNIQUE, -- e.g., "mlb-746532" - MUST BE UNIQUE
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_live BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL
);

-- Indexes for fast game lookups
CREATE INDEX IF NOT EXISTS idx_games_active ON public.games(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_games_external_id ON public.games(external_id);

-- ============================================
-- 3. ROOMS TABLE
-- ============================================
-- Watch party groups (families, friends)
-- BELONGS TO A GAME (rooms.game_id → games.id)

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  share_code VARCHAR(6) UNIQUE NOT NULL,
  description TEXT,
  max_members INT DEFAULT 10 NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  archived_at TIMESTAMPTZ,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL -- NEW: Room belongs to game
);

-- Indexes for fast room lookups
CREATE INDEX IF NOT EXISTS idx_rooms_share_code ON public.rooms(share_code);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON public.rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_rooms_game_id ON public.rooms(game_id);

-- ============================================
-- 4. ROOM MEMBERS TABLE
-- ============================================
-- Tracks who is in which room

CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE NOT NULL,

  UNIQUE(room_id, user_id)
);

-- Indexes for fast membership lookups
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);

-- ============================================
-- 5. PROGRESS MARKERS TABLE
-- ============================================
-- THE CRITICAL TABLE - tracks where each user is in each game

CREATE TABLE IF NOT EXISTS public.progress_markers (
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- THE CRITICAL FIELDS
  pos INT DEFAULT 0 NOT NULL, -- Monotonic position integer
  pos_meta JSONB NOT NULL DEFAULT '{}', -- Sport-specific metadata {inning, half, outs}

  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  PRIMARY KEY (game_id, user_id)
);

-- Indexes for fast position lookups
CREATE INDEX IF NOT EXISTS idx_progress_markers_game_user ON public.progress_markers(game_id, user_id);
CREATE INDEX IF NOT EXISTS idx_progress_markers_user ON public.progress_markers(user_id);

-- ============================================
-- 6. MESSAGES TABLE
-- ============================================
-- Spoiler-locked messages tied to game positions

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) <= 280),
  kind TEXT CHECK (kind IN ('text', 'emoji', 'reaction')) DEFAULT 'text' NOT NULL,

  -- Position locking (THE CRITICAL FIELDS)
  pos INT NOT NULL, -- Position when message was sent
  pos_meta JSONB NOT NULL, -- Sport-specific position details

  -- Moderation
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- CRITICAL INDEX: Enables fast filtering by game and position
CREATE INDEX IF NOT EXISTS idx_messages_game_pos ON public.messages(game_id, pos, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_author ON public.messages(author_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: PROFILES
-- ============================================

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
ON public.profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================
-- RLS POLICIES: GAMES
-- ============================================

DROP POLICY IF EXISTS "Users can view games in their rooms" ON public.games;
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

DROP POLICY IF EXISTS "Authenticated users can create games" ON public.games;
CREATE POLICY "Authenticated users can create games"
ON public.games FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Game creators can update games" ON public.games;
CREATE POLICY "Game creators can update games"
ON public.games FOR UPDATE
USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES: ROOMS
-- ============================================

DROP POLICY IF EXISTS "Users can view their rooms" ON public.rooms;
CREATE POLICY "Users can view their rooms"
ON public.rooms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = rooms.id
    AND room_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
CREATE POLICY "Authenticated users can create rooms"
ON public.rooms FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Room owners can update their rooms" ON public.rooms;
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
-- RLS POLICIES: ROOM MEMBERS
-- ============================================

DROP POLICY IF EXISTS "Users can view members of their rooms" ON public.room_members;
CREATE POLICY "Users can view members of their rooms"
ON public.room_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert themselves as members" ON public.room_members;
CREATE POLICY "Users can insert themselves as members"
ON public.room_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own membership" ON public.room_members;
CREATE POLICY "Users can update own membership"
ON public.room_members FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Room owners can remove members" ON public.room_members;
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
-- RLS POLICIES: PROGRESS MARKERS
-- ============================================

DROP POLICY IF EXISTS "Users can view progress in their games" ON public.progress_markers;
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

DROP POLICY IF EXISTS "Users can insert own progress" ON public.progress_markers;
CREATE POLICY "Users can insert own progress"
ON public.progress_markers FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.progress_markers;
CREATE POLICY "Users can update own progress"
ON public.progress_markers FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: MESSAGES
-- ============================================

-- THE CRITICAL POLICY: Users can only see messages at or before their position
DROP POLICY IF EXISTS "Users can view messages at or before their position" ON public.messages;
CREATE POLICY "Users can view messages at or before their position"
ON public.messages FOR SELECT
USING (
  NOT is_deleted
  AND EXISTS (
    SELECT 1 FROM public.progress_markers pm
    WHERE pm.game_id = messages.game_id
    AND pm.user_id = auth.uid()
    AND messages.pos <= pm.pos -- THE SPOILER FILTER
  )
);

DROP POLICY IF EXISTS "Room members can insert messages" ON public.messages;
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

DROP POLICY IF EXISTS "Authors can delete own messages" ON public.messages;
CREATE POLICY "Authors can delete own messages"
ON public.messages FOR UPDATE
USING (auth.uid() = author_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_visited timestamp
CREATE OR REPLACE FUNCTION update_last_visited()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_visited = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with display_name set to first name from Google
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- Use given_name (first name) from Google OAuth
    COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar_url'
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-add creator as room owner
CREATE OR REPLACE FUNCTION public.handle_new_room()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add creator as room member
DROP TRIGGER IF EXISTS on_room_created ON public.rooms;
CREATE TRIGGER on_room_created
AFTER INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_room();

-- Function to generate random share code (6 chars, alphanumeric)
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to archive room when all its games are finished
CREATE OR REPLACE FUNCTION auto_archive_room_on_game_end()
RETURNS TRIGGER AS $$
BEGIN
  -- If this game just ended (actual_end was set)
  IF NEW.actual_end IS NOT NULL AND OLD.actual_end IS NULL THEN
    -- Archive all rooms for this game
    UPDATE public.rooms
    SET is_archived = TRUE, archived_at = NOW()
    WHERE game_id = NEW.id AND is_archived = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-archive rooms when games end
DROP TRIGGER IF EXISTS on_game_ended ON public.games;
CREATE TRIGGER on_game_ended
AFTER UPDATE ON public.games
FOR EACH ROW
WHEN (NEW.actual_end IS NOT NULL AND OLD.actual_end IS NULL)
EXECUTE FUNCTION auto_archive_room_on_game_end();

-- ============================================
-- KEY ARCHITECTURE NOTES
-- ============================================
--
-- 1. ONE GAME, MANY ROOMS
--    - rooms.game_id → games.id
--    - Multiple families can watch the same MLB game in separate rooms
--    - Each game has unique external_id (e.g., "mlb-813043")
--
-- 2. NO USERNAME FIELD
--    - profiles.display_name is the ONLY name field
--    - Auto-populated from Google OAuth given_name (first name)
--    - Users can edit to anything they want
--    - Permanent IDs: user.id (UUID) and user.email
--
-- 3. SPOILER PREVENTION
--    - messages.pos (integer) locks message to game position
--    - progress_markers.pos tracks where user is in the game
--    - RLS policy: messages.pos <= user.pos (enforced at DB level)
--
-- 4. TRIGGERS
--    - handle_new_user: Auto-create profile on signup
--    - handle_new_room: Auto-add creator as room owner
--    - auto_archive_room_on_game_end: Archive rooms when game ends
--
-- ============================================
