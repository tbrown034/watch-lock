-- Clear Old Data from Database
-- This removes all game/room/message data but keeps user profiles
-- Run this in Supabase SQL Editor or via CLI

-- Delete in order (respecting foreign key constraints)
-- Start with tables that depend on others

-- Step 1: Delete messages (depends on games)
DELETE FROM public.messages;

-- Step 2: Delete progress markers (depends on games)
DELETE FROM public.progress_markers;

-- Step 3: Delete room members (depends on rooms)
DELETE FROM public.room_members;

-- Step 4: Delete rooms (depends on games now!)
DELETE FROM public.rooms;

-- Step 5: Delete games (has no dependencies now)
DELETE FROM public.games;

-- Step 6: Keep profiles! Don't delete user accounts
-- Your Google OAuth login will still work

-- Verify what's left
SELECT
  'messages' as table_name,
  COUNT(*) as remaining_rows
FROM public.messages
UNION ALL
SELECT 'progress_markers', COUNT(*) FROM public.progress_markers
UNION ALL
SELECT 'room_members', COUNT(*) FROM public.room_members
UNION ALL
SELECT 'rooms', COUNT(*) FROM public.rooms
UNION ALL
SELECT 'games', COUNT(*) FROM public.games
UNION ALL
SELECT 'profiles', COUNT(*) FROM public.profiles;
