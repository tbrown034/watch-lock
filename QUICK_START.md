# Quick Start - Testing Watch Lock

**Status:** ✅ Database schema fixed and synced (Jan 16, 2025)

---

## 🚀 Fast Test in 3 Steps

### 1. Start Dev Server
```bash
npm run dev
# Visit http://localhost:3000
```

### 2. Sign In
- Click "Sign in with Google"
- Use your Google account
- Check: Profile created automatically with first name

### 3. Test Core Flow
**Create a Room:**
- Go to `/games` to see today's games
- Click "Create Room" on any game
- Enter room name (will be formatted automatically)
- Check: Room created, share code generated

**View Your Rooms:**
- Go to `/profile`
- See all your rooms
- Click "Enter Room" to join

**Test Spoiler Prevention:**
- Send a message in the room
- Open in incognito (different user)
- Verify: Message only visible after advancing position

---

## 📊 Quick Health Check

Run this in Supabase SQL Editor:

```sql
SELECT
  'profiles' as table_name, COUNT(*) as rows FROM profiles
UNION ALL
SELECT 'games', COUNT(*) FROM games
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'messages', COUNT(*) FROM messages;
```

**Expected:** Non-zero profiles, varying counts for others

---

## 🔧 Common Commands

```bash
# Check migration status
supabase migration list

# Push new migrations
supabase db push

# Clear test data (CAREFUL!)
psql $DATABASE_URL -f scripts/clear-old-data.sql

# View Supabase logs
supabase logs --follow
```

---

## 📚 Full Documentation

- **Complete Status:** `SUPABASE_STATUS_AND_NEXT_STEPS.md`
- **Schema Reference:** `supabase_migration_CURRENT.sql`
- **Profile Schema:** `SCHEMA_SUMMARY.md`
- **README:** `README.md`

---

## 🆘 If Something Breaks

1. Check Supabase Dashboard → Logs
2. Look for RLS policy errors (403)
3. Verify migrations synced: `supabase migration list`
4. See troubleshooting in `SUPABASE_STATUS_AND_NEXT_STEPS.md`

---

**You're all set!** Database is healthy and ready to test. 🎉
