-- ============================================
-- WATCHLOCK DATABASE SCHEMA
-- ============================================
-- This migration creates all tables with Row Level Security
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Extends auth.users with app-specific data
-- One profile per authenticated user

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 2. ROOMS TABLE
-- ============================================
-- Watch party groups (families, friends)

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  share_code VARCHAR(6) UNIQUE NOT NULL,
  description TEXT,
  max_members INT DEFAULT 6 NOT NULL,
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL
);

-- Index for fast share code lookups
CREATE INDEX IF NOT EXISTS idx_rooms_share_code ON public.rooms(share_code);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON public.rooms(created_by);

-- ============================================
-- 3. ROOM MEMBERS TABLE
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

  -- Ensure user can only join room once
  UNIQUE(room_id, user_id)
);

-- Indexes for fast membership lookups
CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON public.room_members(user_id);

-- ============================================
-- 4. GAMES TABLE
-- ============================================
-- Specific sporting events being watched

CREATE TABLE IF NOT EXISTS public.games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  sport TEXT CHECK (sport IN ('mlb', 'nba', 'nfl')) DEFAULT 'mlb' NOT NULL,
  title TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  external_id TEXT, -- e.g., "mlb-746532" for API sync
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_live BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Index for finding active games in a room
CREATE INDEX IF NOT EXISTS idx_games_room_id ON public.games(room_id);
CREATE INDEX IF NOT EXISTS idx_games_active ON public.games(is_active) WHERE is_active = TRUE;

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

-- Index for fast position lookups
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
  body TEXT NOT NULL CHECK (char_length(body) <= 280), -- Twitter-style limit
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
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: PROFILES
-- ============================================

-- Users can view all profiles (for displaying usernames)
CREATE POLICY "Anyone can view profiles"
ON public.profiles FOR SELECT
USING (true);

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================
-- RLS POLICIES: ROOMS
-- ============================================

-- Users can view rooms they're members of OR public rooms
CREATE POLICY "Users can view their rooms or public rooms"
ON public.rooms FOR SELECT
USING (
  is_public = true
  OR EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = rooms.id
    AND room_members.user_id = auth.uid()
  )
);

-- Any authenticated user can create a room
CREATE POLICY "Authenticated users can create rooms"
ON public.rooms FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Only room owners can update rooms
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

-- Users can view members of rooms they're in
CREATE POLICY "Users can view members of their rooms"
ON public.room_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
  )
);

-- Users can join public rooms or rooms with valid share code (enforced in app logic)
CREATE POLICY "Users can insert themselves as members"
ON public.room_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own membership (e.g., mark as favorite)
CREATE POLICY "Users can update own membership"
ON public.room_members FOR UPDATE
USING (auth.uid() = user_id);

-- Room owners can remove members
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
-- RLS POLICIES: GAMES
-- ============================================

-- Users can view games in rooms they're members of
CREATE POLICY "Users can view games in their rooms"
ON public.games FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = games.room_id
    AND room_members.user_id = auth.uid()
  )
);

-- Room members can create games in their rooms
CREATE POLICY "Room members can create games"
ON public.games FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = games.room_id
    AND room_members.user_id = auth.uid()
  )
);

-- Game creators can update their games
CREATE POLICY "Game creators can update games"
ON public.games FOR UPDATE
USING (auth.uid() = created_by);

-- ============================================
-- RLS POLICIES: PROGRESS MARKERS
-- ============================================

-- Users can view progress of users in games they have access to
CREATE POLICY "Users can view progress in their games"
ON public.progress_markers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.games g
    JOIN public.room_members rm ON rm.room_id = g.room_id
    WHERE g.id = progress_markers.game_id
    AND rm.user_id = auth.uid()
  )
);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
ON public.progress_markers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
ON public.progress_markers FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: MESSAGES
-- ============================================

-- THE CRITICAL POLICY: Users can only see messages at or before their position
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

-- Room members can insert messages in their games
CREATE POLICY "Room members can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = author_id
  AND EXISTS (
    SELECT 1 FROM public.games g
    JOIN public.room_members rm ON rm.room_id = g.room_id
    WHERE g.id = messages.game_id
    AND rm.user_id = auth.uid()
  )
);

-- Authors can soft-delete their own messages
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

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
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
CREATE TRIGGER on_room_created
AFTER INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_room();

-- ============================================
-- HELPER FUNCTIONS FOR SHARE CODES
-- ============================================

-- Function to generate random share code (6 chars, alphanumeric)
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed ambiguous chars (0,O,1,I)
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETE!
-- ============================================
-- Your database is now fully set up with:
-- ✅ All tables created
-- ✅ Foreign keys configured
-- ✅ Indexes for performance
-- ✅ RLS enabled on all tables
-- ✅ Security policies enforced at database level
-- ✅ Auto-triggers for user profiles and room membership
-- ✅ Helper functions for share codes
