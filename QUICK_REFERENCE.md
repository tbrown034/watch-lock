# Watch-Lock: Quick Reference Card

Fast answers to common questions. For details, see `AUTH_RULES.md`.

---

## 🚀 Quick Start

### Apply the Clean Schema Migration

```bash
# 1. Backup first!
# Go to: https://supabase.com/dashboard/project/msdemnzgwzaokzjyymgi
# Database → Backups → Create backup

# 2. Open SQL Editor
# Go to: https://supabase.com/dashboard/project/msdemnzgwzaokzjyymgi/sql

# 3. Copy and run
# File: supabase/migrations/20250120000000_clean_schema_reset.sql
```

---

## 📊 Database Schema (Quick View)

```
auth.users (Supabase)
    ↓
profiles (id, display_name, avatar_url)
    ↓
games (id, external_id, title, sport)
    ↓
rooms (id, game_id, share_code, created_by)
    ↓
room_members (room_id, user_id, role)
    ↓
progress_markers (game_id, user_id, pos, pos_meta)
messages (game_id, author_id, body, pos)
```

**Key:** `games ← rooms` (one game, many rooms)

---

## 🔐 Which Client to Use?

### Browser Client
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = useMemo(() => createClient(), [])
```
**Use in:** Client Components only

### Server Client
```tsx
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```
**Use in:** Server Components, API Routes, Server Actions

### Admin Client
```tsx
import { createAdminClient } from '@/lib/supabase/admin'
const admin = createAdminClient()
```
**Use in:** API Routes only (bypasses RLS)
**⚠️ WARNING:** Bypasses ALL security policies!

---

## 🛡️ Protect a Page (Server Component)

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/') // Send unauthenticated users home
  }

  return <div>Hello {user.email}</div>
}
```

**✅ DO:** Use `getUser()` (validates with auth server)
**❌ DON'T:** Use `getSession()` (can be spoofed)

---

## 🔒 Protect an API Route

```tsx
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Proceed with authenticated operation
  const body = await request.json()
  // ...
}
```

---

## 🔑 Auth Patterns

### Sign In (Client Component)
```tsx
const supabase = createClient()
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

### Sign Out
```tsx
await supabase.auth.signOut()
```

### Check Auth State (Client)
```tsx
const [user, setUser] = useState(null)
const supabase = useMemo(() => createClient(), [])

useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => setUser(session?.user ?? null)
  )

  return () => subscription.unsubscribe()
}, [supabase])
```

---

## 📝 RLS Cheat Sheet

### See What You Can Query
```sql
-- As authenticated user, these queries respect RLS:

SELECT * FROM profiles;        -- ✅ See ALL profiles (needed for display names)
SELECT * FROM rooms;           -- ✅ See ONLY rooms you're a member of
SELECT * FROM games;           -- ✅ See games in your rooms
SELECT * FROM messages;        -- ✅ See ONLY messages at/before your position
```

### Bypass RLS (Admin Only)
```tsx
// In API route
const admin = createAdminClient()
const { data } = await admin.from('rooms').select('*')
// Returns ALL rooms, ignoring RLS
```

---

## 🐛 Troubleshooting

### "Profile not found"
```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Manually create profile
INSERT INTO public.profiles (id, display_name)
VALUES ('<user-id>', 'Test User');
```

### "Infinite recursion in policy"
```sql
-- Drop ALL policies and re-run migration
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;
```

### "Session not persisting"
1. Check middleware is running (see `middleware.ts`)
2. Clear browser cookies
3. Sign in again

### "Can't see rooms I joined"
```sql
-- Check you're actually a member
SELECT r.name, rm.role
FROM public.room_members rm
JOIN public.rooms r ON r.id = rm.room_id
WHERE rm.user_id = '<your-user-id>';
```

---

## 🧪 Test Checklist

After migration:
- [ ] Sign up new user → profile auto-created
- [ ] Create room → auto-added as owner
- [ ] Join room with share code → added as member
- [ ] Send message → appears in room
- [ ] Move position backward → message disappears (spoiler filter)
- [ ] Update display name → appears in header
- [ ] Sign out → redirected to home

---

## 📚 Where to Find Things

| Question | File |
|----------|------|
| How does auth work? | `AUTH_RULES.md` |
| How do I apply migration? | `MIGRATION_GUIDE.md` |
| What changed? | `CLEANUP_SUMMARY.md` |
| Quick answers? | `QUICK_REFERENCE.md` (this file) |
| Database schema? | `supabase/migrations/20250120000000_clean_schema_reset.sql` |

---

## 🔗 Important Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/msdemnzgwzaokzjyymgi
- **SQL Editor:** https://supabase.com/dashboard/project/msdemnzgwzaokzjyymgi/sql
- **Supabase Docs:** https://supabase.com/docs/guides/auth/server-side/nextjs

---

## ⚠️ Critical Rules

### ✅ DO:
- Use `getUser()` on server (validates with auth server)
- Use `useMemo(() => createClient(), [])` in client components
- Call `await cookies()` before creating server client
- Enable RLS on all tables
- Backup before running migrations

### ❌ DON'T:
- Use `getSession()` on server (can be spoofed)
- Put supabase client in dependency arrays
- Import admin client in client components
- Skip middleware (required for SSR)
- Trust `user_metadata` for authorization
- Run migrations without backing up first

---

## 🚨 Emergency Rollback

If migration breaks everything:

1. **Go to Supabase Dashboard → Database → Backups**
2. **Select your backup**
3. **Click "Restore"**
4. **Clear browser cookies**
5. **Restart dev server**

---

**Last Updated:** 2025-01-20
