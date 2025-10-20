# Watch-Lock: Database Migration Guide

**Created:** 2025-01-20
**Migration:** Clean Schema Reset (20250120000000)

---

## Overview

This guide helps you apply the clean database schema reset that:
- ✅ Fixes all table relationships (`games ← rooms`, not `games.room_id`)
- ✅ Removes deprecated `username` field (uses `display_name` only)
- ✅ Eliminates RLS infinite recursion issues
- ✅ Follows Supabase official patterns exactly
- ✅ Properly documents all auth flows and security policies

---

## Before You Start

### 1. Backup Your Database

**Via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard/project/msdemnzgwzaokzjyymgi
2. Navigate to Database → Backups
3. Click "Create backup" (or ensure automatic backups are enabled)

**Via SQL Export:**
```bash
# If you have Supabase CLI installed and Docker running
supabase db dump -f backup_$(date +%Y%m%d).sql
```

### 2. Review Current Data

```sql
-- Check how many users/rooms/games you have
SELECT
  (SELECT COUNT(*) FROM auth.users) as users,
  (SELECT COUNT(*) FROM public.profiles) as profiles,
  (SELECT COUNT(*) FROM public.rooms) as rooms,
  (SELECT COUNT(*) FROM public.games) as games,
  (SELECT COUNT(*) FROM public.messages) as messages;
```

**⚠️ WARNING:** This migration will DROP and recreate all tables with CASCADE.
All existing data will be lost. Only proceed if you're okay losing current data OR you've backed it up.

---

## Migration Options

### Option 1: Fresh Start (Recommended for Development)

If you're okay losing all test data and starting fresh:

1. **Open Supabase SQL Editor:**
   https://supabase.com/dashboard/project/msdemnzgwzaokzjyymgi/sql

2. **Copy the migration file:**
   ```bash
   cat supabase/migrations/20250120000000_clean_schema_reset.sql
   ```

3. **Paste into SQL Editor and click "Run"**

4. **Verify tables were created:**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

   Should return:
   ```
   games
   messages
   profiles
   progress_markers
   room_members
   rooms
   ```

5. **Verify RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

   All tables should have `rowsecurity = true`

6. **Verify policies exist:**
   ```sql
   SELECT tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;
   ```

### Option 2: Preserve Data (Advanced)

If you need to preserve existing data:

1. **Export data from existing tables:**
   ```sql
   -- Export profiles
   COPY (SELECT * FROM public.profiles)
   TO '/tmp/profiles_backup.csv' CSV HEADER;

   -- Export rooms (if schema matches)
   COPY (SELECT * FROM public.rooms)
   TO '/tmp/rooms_backup.csv' CSV HEADER;

   -- Repeat for other tables...
   ```

2. **Run the migration** (destroys data)

3. **Re-import data:**
   ```sql
   COPY public.profiles FROM '/tmp/profiles_backup.csv' CSV HEADER;
   -- Repeat for other tables...
   ```

**Note:** This requires careful schema mapping and may not work if relationships changed significantly.

---

## Post-Migration Verification

### 1. Test User Signup

1. Sign out of your app (if logged in)
2. Clear browser cookies for `localhost:3000`
3. Sign in with Google
4. Check that profile was auto-created:

```sql
SELECT id, display_name, avatar_url, created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;
```

### 2. Test Room Creation

1. Navigate to `/games`
2. Click "Create Room" on any game
3. Fill out room details and submit
4. Verify in database:

```sql
-- Check game was created
SELECT id, external_id, title, created_by, created_at
FROM public.games
ORDER BY created_at DESC
LIMIT 1;

-- Check room was created
SELECT id, game_id, name, share_code, created_by
FROM public.rooms
ORDER BY created_at DESC
LIMIT 1;

-- Check you were auto-added as owner
SELECT rm.role, p.display_name, r.name as room_name
FROM public.room_members rm
JOIN public.profiles p ON p.id = rm.user_id
JOIN public.rooms r ON r.id = rm.room_id
ORDER BY rm.joined_at DESC
LIMIT 1;
```

Should show you as `owner` of the room you just created.

### 3. Test Room Joining

1. Copy the share code from the room you created
2. Open an incognito window (or different browser)
3. Sign in with a different Google account
4. Click "Join Room" and enter the share code
5. Verify both members appear:

```sql
SELECT
  r.name as room_name,
  r.share_code,
  p.display_name,
  rm.role,
  rm.joined_at
FROM public.room_members rm
JOIN public.profiles p ON p.id = rm.user_id
JOIN public.rooms r ON r.id = rm.room_id
ORDER BY r.created_at DESC, rm.joined_at;
```

### 4. Test RLS Policies

```sql
-- Test that users can only see their own rooms
-- (This query should only return rooms you're a member of)
SELECT * FROM public.rooms;

-- Test that you can view all profiles (for display names)
SELECT display_name FROM public.profiles;

-- Test spoiler filter on messages
-- (Should only show messages at or before your current position)
SELECT * FROM public.messages;
```

### 5. Test Triggers

**Profile auto-creation:**
```sql
-- Check that trigger function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check that trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND event_object_table = 'users';
```

**Room owner auto-add:**
```sql
-- Check that trigger function exists
SELECT proname
FROM pg_proc
WHERE proname = 'handle_new_room';

-- Check that trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'rooms';
```

---

## Common Issues & Fixes

### Issue: "function auth.uid() does not exist"

**Cause:** Running migration outside Supabase environment

**Fix:** Run the migration in Supabase SQL Editor, not locally

---

### Issue: "relation 'profiles' already exists"

**Cause:** Migration already partially ran

**Fix:**
```sql
-- Drop all tables manually first
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.progress_markers CASCADE;
DROP TABLE IF EXISTS public.room_members CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.games CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Then re-run the migration
```

---

### Issue: "infinite recursion detected in policy"

**Cause:** Old RLS policies still exist

**Fix:** The migration drops all policies first. If you still see this:
```sql
-- Manually drop ALL policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Then re-run the migration
```

---

### Issue: "Profile not created on signup"

**Cause:** Trigger isn't firing

**Fix:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If missing, recreate it manually:
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

---

## Rollback Plan

If something goes wrong and you need to rollback:

### Option 1: Restore from Backup

1. Go to Supabase Dashboard → Database → Backups
2. Select your backup
3. Click "Restore"

### Option 2: Manually Recreate Old Schema

If you didn't backup, you'll need to manually recreate tables.
Reference your previous migration files in `supabase/migrations/`.

**⚠️ This is why backups are critical!**

---

## Next Steps After Migration

1. **Update `.env.local`** (if needed):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://msdemnzgwzaokzjyymgi.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
   ```

2. **Review AUTH_RULES.md:**
   - Read the updated documentation
   - Understand the new schema relationships
   - Review RLS policies and best practices

3. **Test all user flows:**
   - Sign up / Sign in
   - Create room
   - Join room
   - Send message
   - View messages (verify spoiler filter)
   - Edit profile
   - Sign out

4. **Deploy to production:**
   ```bash
   # Commit changes
   git add .
   git commit -m "feat: clean database schema reset with proper auth"
   git push origin main

   # Vercel will auto-deploy
   ```

5. **Run migration on production:**
   - Backup production database first!
   - Run migration in production Supabase SQL Editor
   - Test thoroughly before announcing to users

---

## Support

If you encounter issues:

1. Check the **Troubleshooting** section in AUTH_RULES.md
2. Review Supabase logs in Dashboard → Logs
3. Check browser console for client-side errors
4. Review migration file: `supabase/migrations/20250120000000_clean_schema_reset.sql`

---

## Summary Checklist

Before migration:
- [ ] Backup database
- [ ] Review current data
- [ ] Understand schema changes

During migration:
- [ ] Run migration SQL
- [ ] Verify tables created
- [ ] Verify RLS enabled
- [ ] Verify policies exist
- [ ] Verify triggers exist

After migration:
- [ ] Test user signup
- [ ] Test room creation
- [ ] Test room joining
- [ ] Test RLS policies
- [ ] Update documentation
- [ ] Deploy to production (after thorough testing)

---

**Migration Date:** [YOUR_DATE_HERE]
**Applied By:** [YOUR_NAME_HERE]
**Status:** [ ] Success / [ ] Failed / [ ] Rolled Back
**Notes:**
[Add any notes about issues encountered or deviations from this guide]
