-- Run this in Supabase SQL Editor to clear all data
-- This will delete all rooms, games, messages, and progress markers

DELETE FROM public.messages;
DELETE FROM public.progress_markers;
DELETE FROM public.room_members;
DELETE FROM public.games;
DELETE FROM public.rooms;

-- Optionally clean up orphaned profiles (profiles without auth.users)
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

SELECT 'Database cleared successfully' as status;
