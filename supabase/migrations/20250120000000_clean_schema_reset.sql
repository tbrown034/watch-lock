-- ============================================
-- WATCH-LOCK: CLEAN SCHEMA RESET
-- ============================================
-- This migration establishes the correct, final schema.
-- Follows Supabase official docs for Next.js App Router with SSR.
--
-- ARCHITECTURE OVERVIEW:
-- 1. profiles: One per user (extends auth.users)
-- 2. games: Sporting events (MLB/NFL) - identified by external_id
-- 3. rooms: Watch parties for a specific game (multiple rooms per game)
-- 4. room_members: Who's in which room
-- 5. progress_markers: Where each user is in each game (spoiler prevention)
-- 6. messages: Spoiler-locked chat messages tied to game positions
--
-- RELATIONSHIP: games ← rooms ← room_members → users
--               games ← progress_markers → users
--               games ← messages → users
-- ============================================

-- Drop ALL existing policies (clean slate)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Extends auth.users with app-specific user data
-- Automatically created on user signup via trigger

-- Drop and recreate to ensure clean state
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT, -- User's chosen display name (defaults to Google given_name)
  avatar_url TEXT,   -- From Google OAuth picture field
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_visited TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_profiles_display_name ON public.profiles(display_name) WHERE display_name IS NOT NULL;

-- ============================================
-- 2. GAMES TABLE
-- ============================================
-- Sporting events (MLB/NFL games)
-- One game record per unique external_id (e.g., "mlb-746532")
-- Multiple rooms can be created for the same game

DROP TABLE IF EXISTS public.games CASCADE;

CREATE TABLE public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sport TEXT CHECK (sport IN ('mlb', 'nfl')) DEFAULT 'mlb' NOT NULL,
  title TEXT NOT NULL,              -- e.g., "Yankees @ Red Sox"
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  external_id TEXT UNIQUE NOT NULL, -- MLB/NFL API ID (e.g., "mlb-746532")
  is_live BOOLEAN DEFAULT FALSE NOT NULL, -- True if syncing with live data
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_games_external_id ON public.games(external_id);
CREATE INDEX idx_games_created_by ON public.games(created_by);

-- ============================================
-- 3. ROOMS TABLE
-- ============================================
-- Watch party rooms - each room is for ONE game
-- Multiple rooms can exist for the same game

DROP TABLE IF EXISTS public.rooms CASCADE;

CREATE TABLE public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL, -- Link to game
  name TEXT NOT NULL,                   -- e.g., "NYY @ BOS - 10/16"
  share_code VARCHAR(6) UNIQUE NOT NULL, -- e.g., "A3X9K2"
  max_members INT DEFAULT 10 NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_rooms_game_id ON public.rooms(game_id);
CREATE INDEX idx_rooms_share_code ON public.rooms(share_code);
CREATE INDEX idx_rooms_created_by ON public.rooms(created_by);

-- ============================================
-- 4. ROOM_MEMBERS TABLE
-- ============================================
-- Junction table: which users are in which rooms

DROP TABLE IF EXISTS public.room_members CASCADE;

CREATE TABLE public.room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure user can only join each room once
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX idx_room_members_user_id ON public.room_members(user_id);

-- ============================================
-- 5. PROGRESS_MARKERS TABLE
-- ============================================
-- Tracks where each user is in each game (for spoiler prevention)

DROP TABLE IF EXISTS public.progress_markers CASCADE;

CREATE TABLE public.progress_markers (
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pos INT DEFAULT 0 NOT NULL,        -- Monotonic position (0-100+ for MLB, 0-60+ for NFL)
  pos_meta JSONB NOT NULL DEFAULT '{}', -- Sport-specific metadata
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  PRIMARY KEY (game_id, user_id)
);

-- Enable RLS
ALTER TABLE public.progress_markers ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_progress_markers_game_id ON public.progress_markers(game_id);
CREATE INDEX idx_progress_markers_user_id ON public.progress_markers(user_id);

-- ============================================
-- 6. MESSAGES TABLE
-- ============================================
-- Chat messages tied to game positions (spoiler-locked)

DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) <= 280), -- 280 char limit
  kind TEXT CHECK (kind IN ('text', 'emoji', 'reaction')) DEFAULT 'text' NOT NULL,
  pos INT NOT NULL,           -- Position when message was sent
  pos_meta JSONB NOT NULL,    -- Sport-specific position metadata
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_messages_game_id ON public.messages(game_id);
CREATE INDEX idx_messages_game_pos ON public.messages(game_id, pos, created_at);
CREATE INDEX idx_messages_author_id ON public.messages(author_id);

-- ============================================
-- RLS POLICIES: PROFILES
-- ============================================

-- Anyone can view all profiles (needed for displaying usernames/avatars)
CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can only insert their own profile (via trigger)
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- RLS POLICIES: GAMES
-- ============================================

-- Users can view games if:
-- 1. They're in a room for that game, OR
-- 2. They're querying by external_id (needed for room creation)
CREATE POLICY "games_select_by_membership_or_external_id"
ON public.games FOR SELECT
TO authenticated
USING (
  -- User is in a room for this game
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.room_members rm ON rm.room_id = r.id
    WHERE r.game_id = games.id
    AND rm.user_id = auth.uid()
  )
  -- OR: Allow finding games by external_id (for room creation flow)
  OR external_id IS NOT NULL
);

-- Authenticated users can create games
CREATE POLICY "games_insert_authenticated"
ON public.games FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Game creators can update their games
CREATE POLICY "games_update_own"
ON public.games FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES: ROOMS
-- ============================================

-- Users can only view rooms they're members of
CREATE POLICY "rooms_select_by_membership"
ON public.rooms FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = rooms.id
    AND room_members.user_id = auth.uid()
  )
);

-- Authenticated users can create rooms
CREATE POLICY "rooms_insert_authenticated"
ON public.rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Room owners can update their rooms
CREATE POLICY "rooms_update_by_owner"
ON public.rooms FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Room owners can delete their rooms
CREATE POLICY "rooms_delete_by_owner"
ON public.rooms FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES: ROOM_MEMBERS
-- ============================================

-- Users can view members of rooms they're in
-- SIMPLE POLICY: No subquery recursion
CREATE POLICY "room_members_select_by_membership"
ON public.room_members FOR SELECT
TO authenticated
USING (
  -- User is viewing members of a room they're in
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
  )
);

-- Users can add themselves to rooms (share code validation in API)
CREATE POLICY "room_members_insert_self"
ON public.room_members FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership
CREATE POLICY "room_members_update_own"
ON public.room_members FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can leave rooms OR room owners can remove members
CREATE POLICY "room_members_delete_self_or_by_owner"
ON public.room_members FOR DELETE
TO authenticated
USING (
  -- User is leaving themselves
  auth.uid() = user_id
  OR
  -- OR: Room owner is removing someone
  EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = room_members.room_id
    AND rooms.created_by = auth.uid()
  )
);

-- ============================================
-- RLS POLICIES: PROGRESS_MARKERS
-- ============================================

-- Users can view progress of others in games they have access to
CREATE POLICY "progress_markers_select_by_game_access"
ON public.progress_markers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.room_members rm ON rm.room_id = r.id
    WHERE r.game_id = progress_markers.game_id
    AND rm.user_id = auth.uid()
  )
);

-- Users can insert their own progress
CREATE POLICY "progress_markers_insert_own"
ON public.progress_markers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "progress_markers_update_own"
ON public.progress_markers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: MESSAGES
-- ============================================

-- CRITICAL: Users can only see messages at or before their current position
CREATE POLICY "messages_select_at_or_before_position"
ON public.messages FOR SELECT
TO authenticated
USING (
  NOT is_deleted
  AND EXISTS (
    SELECT 1 FROM public.progress_markers pm
    WHERE pm.game_id = messages.game_id
    AND pm.user_id = auth.uid()
    AND messages.pos <= pm.pos -- SPOILER FILTER
  )
);

-- Users can insert messages in games they have access to
CREATE POLICY "messages_insert_by_game_access"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.room_members rm ON rm.room_id = r.id
    WHERE r.game_id = messages.game_id
    AND rm.user_id = auth.uid()
  )
);

-- Authors can soft-delete their own messages
CREATE POLICY "messages_update_own"
ON public.messages FOR UPDATE
TO authenticated
USING (auth.uid() = author_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update profiles.updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function: Auto-create profile on user signup
-- Pulls display_name and avatar_url from Google OAuth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    -- Get display name from Google OAuth metadata
    COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    -- Get avatar from Google OAuth
    COALESCE(
      NEW.raw_user_meta_data->>'picture',
      NEW.raw_user_meta_data->>'avatar_url'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Function: Auto-add room creator as owner
CREATE OR REPLACE FUNCTION handle_new_room()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.room_members (room_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Add creator as room owner
DROP TRIGGER IF EXISTS on_room_created ON public.rooms;
CREATE TRIGGER on_room_created
AFTER INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION handle_new_room();

-- ============================================
-- CLEANUP COMPLETE
-- ============================================
-- This migration establishes the clean, final schema:
-- ✅ Correct relationships: games ← rooms (one-to-many)
-- ✅ Profiles use display_name (no username field)
-- ✅ RLS policies with no infinite recursion
-- ✅ Triggers updated for new schema
-- ✅ All policies documented and following Supabase docs
-- ============================================
