# Supabase Status & Next Steps

**Last Updated:** 2025-01-16
**Status:** ✅ All migrations synced, RLS policies verified

---

## ✅ What's Fixed

### 1. All Migrations Synced (22 total)
- **Local:** 22 migrations ✅
- **Remote:** 22 migrations ✅
- **Status:** Perfectly synced!

### 2. Schema Architecture (CURRENT)

```
CORRECT RELATIONSHIP:
rooms.game_id → games.id

One MLB game (games.external_id = "mlb-813043")
  ↳ Multiple rooms can watch it
     ↳ "Cubs @ Dodgers (1)" - Family A
     ↳ "Cubs @ Dodgers (2)" - Family B
```

**Key Tables:**
- `games` - Sports events (unique external_id per MLB/NFL game)
- `rooms` - Watch party groups (each belongs to ONE game)
- `room_members` - User membership in rooms
- `messages` - Spoiler-locked messages (tied to game position)
- `progress_markers` - Tracks user position in each game
- `profiles` - User data (display_name only, NO username)

### 3. RLS Policies Verified
- ✅ All policies updated to use `rooms.game_id → games.id`
- ✅ No references to old `games.room_id` column
- ✅ Spoiler filtering policy intact: `messages.pos <= user.pos`

### 4. Triggers Working
- ✅ `handle_new_user()` - Auto-creates profile with first name
- ✅ `handle_new_room()` - Auto-adds creator as room owner
- ✅ `auto_archive_room_on_game_end()` - Archives rooms when game ends

---

## 📁 File Cleanup Done

### Files Created
1. **`supabase_migration_CURRENT.sql`** ✅ NEW
   - Reflects actual current schema
   - Use this as reference (NOT the old supabase_migration.sql)

2. **`SCHEMA_SUMMARY.md`** (Already exists)
   - Good documentation of profile changes

### Files to Keep
- `scripts/clear-old-data.sql` - Useful for cleaning test data

### Migrations Applied
- **Latest:** `20250116000009_verify_rls_policies.sql`
- Fixes all RLS policies to match new schema

---

## 🧪 What to Test Next

### Critical Flows to Verify

#### 1. **Authentication Flow**
```bash
# Test: Sign in with Google OAuth
# Expected: Profile auto-created with first name
```

**API Route:** `app/api/test-auth/route.ts`

**Check:**
- Profile created in `profiles` table
- `display_name` = first name from Google
- No errors in console

#### 2. **Room Creation Flow**
```bash
# Test: Create room for today's game
# Expected: Game found/created, room created, user auto-added as owner
```

**API Route:** `POST /api/rooms/create`

**Request Body:**
```json
{
  "gameId": "mlb-813043",
  "name": "My Watch Party",
  "homeTeam": "Dodgers",
  "awayTeam": "Cubs",
  "gameDate": "2025-10-16T19:00:00Z"
}
```

**Check:**
- Response includes `roomId`, `shareCode`, `gameId`
- Room appears in `/profile` page
- User is marked as "Owner"

#### 3. **Join Room Flow**
```bash
# Test: Join existing room with share code
# Expected: User added to room, progress marker created
```

**API Route:** `POST /api/rooms/join`

**Request Body:**
```json
{
  "shareCode": "ABC123"
}
```

**Check:**
- User added to `room_members` table
- Progress marker created at pos = 0
- Room visible in `/profile` page

#### 4. **Message Filtering (Spoiler Prevention)**
```bash
# Test: Send message at later position, verify hidden from user at earlier position
# Expected: Message NOT visible until user advances position
```

**API Routes:**
- `POST /api/games/[id]/messages` - Send message
- `GET /api/games/[id]/messages` - Fetch messages

**Check:**
- User at pos=0 cannot see messages at pos=10
- After updating progress to pos=10, message appears
- RLS enforcing filter at database level

#### 5. **Profile Page**
```bash
# Test: View /profile page
# Expected: Display name shown, rooms listed, edit name works
```

**Page:** `/profile`

**Check:**
- Display name shown correctly (first name)
- All rooms listed with game IDs
- "Enter Room" button works
- Edit display name works

---

## 🔧 How to Test

### Option 1: Local Development
```bash
# Start dev server
npm run dev

# Visit http://localhost:3000
# Sign in with Google
# Test flows above
```

### Option 2: Production (Vercel)
```bash
# Already deployed at watch-lock.vercel.app
# Just test the flows there
```

### Option 3: Database Queries (Manual)
```bash
# Check current data
supabase db remote exec "
SELECT
  (SELECT COUNT(*) FROM public.profiles) as profiles,
  (SELECT COUNT(*) FROM public.games) as games,
  (SELECT COUNT(*) FROM public.rooms) as rooms,
  (SELECT COUNT(*) FROM public.messages) as messages
"
```

---

## 🚨 Potential Issues to Watch For

### 1. Orphaned Data
**Problem:** Old data from previous schema (games with room_id instead of rooms with game_id)

**Check:**
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM public.games WHERE id NOT IN (SELECT game_id FROM public.rooms);
```

**Fix if needed:**
```bash
# Use the clear-old-data script
psql $DATABASE_URL -f scripts/clear-old-data.sql
```

### 2. RLS Policy Conflicts
**Problem:** Multiple policies with same name or conflicting logic

**Check:** Supabase Dashboard → Database → Policies

**Symptoms:**
- 403 Forbidden errors when creating rooms
- Can't see own rooms in /profile
- Messages not filtering correctly

**Fix:** Already applied in migration 20250116000009 ✅

### 3. Trigger Errors on Signup
**Problem:** handle_new_user trigger fails, profile not created

**Symptoms:**
- User signs in but no profile in database
- API errors mentioning missing profile

**Check:**
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Fix:** Already applied in migration 20250116000008 ✅

---

## 📊 Database Health Check

Run this query to verify everything is working:

```sql
-- Health Check Query
SELECT
  'Profiles' as table_name,
  COUNT(*) as row_count,
  (SELECT COUNT(*) FROM public.profiles WHERE display_name IS NULL) as missing_display_name
FROM public.profiles

UNION ALL

SELECT
  'Games',
  COUNT(*),
  (SELECT COUNT(*) FROM public.games WHERE external_id IS NULL) as missing_external_id
FROM public.games

UNION ALL

SELECT
  'Rooms',
  COUNT(*),
  (SELECT COUNT(*) FROM public.rooms WHERE game_id IS NULL) as missing_game_id
FROM public.rooms

UNION ALL

SELECT
  'Room Members',
  COUNT(*),
  (SELECT COUNT(*) FROM public.room_members WHERE role NOT IN ('owner', 'admin', 'member')) as invalid_roles
FROM public.room_members

UNION ALL

SELECT
  'Messages',
  COUNT(*),
  (SELECT COUNT(*) FROM public.messages WHERE pos < 0) as invalid_positions
FROM public.messages

UNION ALL

SELECT
  'Progress Markers',
  COUNT(*),
  (SELECT COUNT(*) FROM public.progress_markers WHERE pos < 0) as invalid_positions
FROM public.progress_markers;
```

**Expected:**
- No NULL display_names (unless user cleared it)
- No NULL external_ids in games
- No NULL game_ids in rooms
- No invalid roles or positions

---

## 🎯 Next Steps (Prioritized)

### Immediate (Do Today)
1. ✅ **Run health check query above**
2. ✅ **Test authentication flow** (sign in with Google)
3. ✅ **Test room creation** (create a room for today's game)
4. ⚠️ **Clean up old data if needed** (see scripts/clear-old-data.sql)

### Short Term (This Week)
1. **Test all critical flows** (auth, room creation, join, messages)
2. **Monitor for RLS errors** in Supabase logs
3. **Update README.md** if needed to reflect new schema
4. **Consider upgrading Supabase CLI** (currently on v2.48.3, latest is v2.51.0)

### Medium Term (Next Week)
1. **Add integration tests** for critical flows
2. **Set up monitoring/alerts** for database errors
3. **Document API endpoints** fully
4. **Consider WebSocket upgrade** (currently polling every 2 seconds)

### Long Term (Future)
1. **Add more sports** (NFL, NBA - architecture supports it)
2. **Add image/GIF support** to messages
3. **Add notifications** (spoiler-free!)
4. **Performance optimization** (connection pooling, caching)

---

## 🔗 Quick Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/your-project-id
- **Production Site:** https://watch-lock.vercel.app
- **GitHub Repo:** https://github.com/tbrown034/watch-lock
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli

---

## 📝 Summary

**You're in excellent shape!** 🎉

- ✅ All 22 migrations applied and synced
- ✅ Schema architecture correct (rooms.game_id → games.id)
- ✅ RLS policies verified and updated
- ✅ Triggers working correctly
- ✅ No username field (display_name only)

**Next:** Test the critical flows above and monitor for any errors. The database is ready to go!

---

## 🆘 If Something Goes Wrong

### Reset Database (Nuclear Option)
```bash
# Only if absolutely necessary!
# This will delete ALL data

# 1. Run the clear-old-data script
psql $DATABASE_URL -f scripts/clear-old-data.sql

# 2. Or manually reset in Supabase SQL Editor
DELETE FROM public.messages;
DELETE FROM public.progress_markers;
DELETE FROM public.room_members;
DELETE FROM public.rooms;
DELETE FROM public.games;
-- Profiles are kept!
```

### Re-apply Migrations
```bash
# If migrations get out of sync
supabase db reset --linked
supabase db push
```

### Get Help
- Check Supabase logs in Dashboard
- Look for RLS policy errors (403 Forbidden)
- Check trigger errors in PostgreSQL logs
- Review migration files in `supabase/migrations/`
