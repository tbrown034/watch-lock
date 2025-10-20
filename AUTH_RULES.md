# Watch-Lock: Authentication & Authorization Documentation

**Last Updated:** 2025-01-20
**Supabase Version:** Latest (Next.js 15 App Router with SSR)
**Official Docs:** https://supabase.com/docs/guides/auth/server-side/nextjs

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Supabase Client Setup](#supabase-client-setup)
4. [Authentication Patterns](#authentication-patterns)
5. [Row Level Security (RLS)](#row-level-security-rls)
6. [User Flows](#user-flows)
7. [API Routes](#api-routes)
8. [Security Best Practices](#security-best-practices)
9. [Common Patterns & Examples](#common-patterns--examples)

---

## Architecture Overview

### Tech Stack
- **Frontend:** Next.js 15 App Router (React Server Components + Client Components)
- **Database:** Supabase (PostgreSQL + Auth)
- **Auth:** Google OAuth (PKCE flow for SSR)
- **Deployment:** Vercel

### Database Relationship Model
```
auth.users (Supabase managed)
    ↓
profiles (1:1 - app-specific user data)
    ↓
games (sporting events - MLB/NFL)
    ↓
rooms (watch parties for a game - many rooms per game)
    ↓
room_members (junction table - who's in which room)
    ↓
progress_markers (where each user is in each game)
messages (spoiler-locked chat tied to game positions)
```

### Key Concepts

**Games vs. Rooms:**
- **Game:** A single sporting event (e.g., "Yankees @ Red Sox on 10/16")
- **Room:** A watch party for that game (multiple rooms can exist for the same game)
- **Relationship:** `games ← rooms` (one-to-many)

**Spoiler Prevention:**
- Each user has a `progress_marker` tracking their position in the game
- Messages are locked to positions (e.g., "Top 5th, 2 outs")
- Users only see messages at or before their current position

---

## Database Schema

### 1. profiles
Extends `auth.users` with app-specific data.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,           -- User's chosen name (defaults to Google given_name)
  avatar_url TEXT,             -- From Google OAuth picture
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_visited TIMESTAMPTZ DEFAULT NOW()
);
```

**Triggers:**
- Auto-created on user signup (`handle_new_user()` trigger)
- `display_name` populated from Google OAuth `given_name`

### 2. games
Sporting events (MLB/NFL games).

```sql
CREATE TABLE public.games (
  id UUID PRIMARY KEY,
  sport TEXT CHECK (sport IN ('mlb', 'nfl')),
  title TEXT NOT NULL,              -- e.g., "Yankees @ Red Sox"
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  external_id TEXT UNIQUE NOT NULL, -- e.g., "mlb-746532"
  is_live BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

**Key Points:**
- One game per `external_id` (reused across multiple rooms)
- `is_live = true` means syncing with live MLB/NFL APIs

### 3. rooms
Watch party rooms for a specific game.

```sql
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES public.games(id), -- Links to game
  name TEXT NOT NULL,                        -- e.g., "NYY @ BOS - 10/16 (2)"
  share_code VARCHAR(6) UNIQUE NOT NULL,     -- e.g., "A3X9K2"
  max_members INT DEFAULT 10,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Triggers:**
- Auto-adds creator as `owner` role in `room_members` table

### 4. room_members
Junction table: who's in which room.

```sql
CREATE TABLE public.room_members (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id) -- User can only join each room once
);
```

### 5. progress_markers
Tracks where each user is in each game (spoiler prevention).

```sql
CREATE TABLE public.progress_markers (
  game_id UUID REFERENCES public.games(id),
  user_id UUID REFERENCES auth.users(id),
  pos INT DEFAULT 0,              -- Monotonic position integer
  pos_meta JSONB DEFAULT '{}',    -- Sport-specific metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, user_id)
);
```

**pos_meta examples:**
```json
// MLB
{ "sport": "mlb", "inning": 5, "half": "TOP", "outs": 2, "phase": "LIVE" }

// NFL
{ "sport": "nfl", "quarter": 3, "time": "8:42", "possession": "away", "phase": "LIVE" }
```

### 6. messages
Spoiler-locked chat messages.

```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY,
  game_id UUID REFERENCES public.games(id),
  author_id UUID REFERENCES auth.users(id),
  body TEXT CHECK (char_length(body) <= 280),
  kind TEXT CHECK (kind IN ('text', 'emoji', 'reaction')),
  pos INT NOT NULL,        -- Position when message was sent
  pos_meta JSONB NOT NULL, -- Sport-specific position
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Supabase Client Setup

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://msdemnzgwzaokzjyymgi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx  # Server-only, NEVER expose
```

### Client Setup Files

#### 1. Browser Client (`lib/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Usage:** Client Components only
```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
const supabase = useMemo(() => createClient(), [])
```

#### 2. Server Client (`lib/supabase/server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )
}
```

**Usage:** Server Components, API Routes, Server Actions
```tsx
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

#### 3. Admin Client (`lib/supabase/admin.ts`)
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

**⚠️ WARNING:** Bypasses ALL RLS policies. Use only for privileged operations.

#### 4. Middleware (`middleware.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  await supabase.auth.getUser() // Refreshes session
  return supabaseResponse
}
```

**Purpose:** Refreshes auth tokens on EVERY request (required for SSR)

---

## Authentication Patterns

### Google OAuth Flow (PKCE)

1. **User clicks "Sign in with Google"** (client-side)
```tsx
const supabase = createClient()
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
})
```

2. **Google redirects to `/auth/callback?code=xyz`**

3. **Callback handler exchanges code for session**
```tsx
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

4. **User profile auto-created** (via `handle_new_user()` trigger)

### Protecting Pages

**Server Component Pattern:**
```tsx
// app/profile/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/') // Redirect unauthenticated users
  }

  return <div>Hello {user.email}</div>
}
```

**⚠️ NEVER use `getSession()` on server** (can be spoofed)
**✅ ALWAYS use `getUser()`** (validates with Supabase Auth server)

### Protecting API Routes

```tsx
// app/api/rooms/create/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Proceed with authenticated operation...
}
```

### Sign Out

```tsx
await supabase.auth.signOut() // Signs out all sessions
await supabase.auth.signOut({ scope: 'local' }) // Current session only
```

---

## Row Level Security (RLS)

All tables have RLS enabled. Policies are role-specific (`TO authenticated`).

### profiles

```sql
-- Anyone can view all profiles (for displaying names/avatars)
CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id);
```

### games

```sql
-- Users can view games if:
-- 1. They're in a room for that game, OR
-- 2. Querying by external_id (for room creation)
CREATE POLICY "games_select_by_membership_or_external_id"
ON public.games FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.room_members rm ON rm.room_id = r.id
    WHERE r.game_id = games.id AND rm.user_id = auth.uid()
  )
  OR external_id IS NOT NULL
);
```

### rooms

```sql
-- Users can only view rooms they're members of
CREATE POLICY "rooms_select_by_membership"
ON public.rooms FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = rooms.id
    AND room_members.user_id = auth.uid()
  )
);

-- Room owners can delete their rooms
CREATE POLICY "rooms_delete_by_owner"
ON public.rooms FOR DELETE TO authenticated
USING (auth.uid() = created_by);
```

### room_members

```sql
-- Simple policy: Users can view members of rooms they're in
CREATE POLICY "room_members_select_by_membership"
ON public.room_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
  )
);
```

**Why this is safe:** Room membership isn't sensitive data. Users can only join rooms with share codes anyway.

### messages

```sql
-- CRITICAL: Users only see messages at or before their position
CREATE POLICY "messages_select_at_or_before_position"
ON public.messages FOR SELECT TO authenticated
USING (
  NOT is_deleted
  AND EXISTS (
    SELECT 1 FROM public.progress_markers pm
    WHERE pm.game_id = messages.game_id
    AND pm.user_id = auth.uid()
    AND messages.pos <= pm.pos -- SPOILER FILTER
  )
);
```

**This is the core spoiler-prevention mechanism.**

---

## User Flows

### 1. Header Authentication Display

**Not Signed In:**
- Show "Sign in" button
- Clicking triggers Google OAuth flow

**Signed In:**
- Show profile icon + display name
- Clicking navigates to `/profile`

### 2. Create Room Flow

**User Signed In:**
1. Click "Create Room" on game card
2. Modal opens with room settings
3. Submit creates room + auto-joins as owner
4. Redirects to `/games/[id]` (game room page)

**User Not Signed In:**
1. Click "Create Room"
2. Show "Sign in required" modal
3. After OAuth, return to `/games` and auto-open room creation modal

### 3. Join Room Flow

**User Signed In:**
1. Click "Join Room" button
2. Enter 6-character share code
3. Validates code and adds user to room
4. Redirects to `/games/[id]`

**User Not Signed In:**
1. Shows auth modal first
2. After OAuth, prompts for share code

### 4. Profile Page (`/profile`)

**When Signed In:**
- Display user info (email, display name, avatar)
- Show "My Rooms" with active rooms
- Edit display name functionality
- Sign out button

**When Not Signed In:**
- Redirect to home page `/`

---

## API Routes

### POST /api/rooms/create
**Auth:** Required
**Purpose:** Create a new watch party room

**Request:**
```json
{
  "gameId": "mlb-746532",
  "name": "My Watch Party",
  "maxMembers": 10,
  "homeTeam": "Yankees",
  "awayTeam": "Red Sox",
  "gameDate": "2025-10-16T..."
}
```

**Response:**
```json
{
  "roomId": "uuid",
  "roomName": "NYY @ BOS - 10/16 (2)",
  "shareCode": "ABC123",
  "gameId": "mlb-746532",
  "success": true
}
```

### GET /api/games/[id]/messages
**Auth:** Required (room member)
**Purpose:** Fetch spoiler-locked messages

**Query Params:**
- `limit`: number (default 50, max 100)
- `before`: message ID for pagination

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "authorId": "uuid",
      "displayName": "Alice",
      "body": "Great catch!",
      "pos": 31,
      "posMeta": {...}
    }
  ]
}
```

### POST /api/games/[id]/messages
**Auth:** Required (room member)
**Purpose:** Create a new message

**Request:**
```json
{
  "body": "Great catch!",
  "pos": 31,
  "posMeta": {"inning": 3, "half": "TOP", "outs": 1}
}
```

### GET /api/games/[id]/state
**Auth:** None (public)
**Purpose:** Fetch live game state from MLB/NFL APIs

**Why Public?**
Proxies public data from MLB StatsAPI and ESPN. Does NOT expose user data.

---

## Security Best Practices

### ✅ DO

1. **Use `getUser()` to protect pages/routes** (validates with auth server)
2. **Use `createBrowserClient` in Client Components**
3. **Use `createServerClient` in Server Components/API Routes**
4. **Always call `await cookies()` before creating server client** (opts out of caching)
5. **Use `useMemo(() => createClient(), [])` in client components**
6. **Enable RLS on all public tables**
7. **Use `TO authenticated` in RLS policies** (better performance)
8. **Wrap auth functions in `(select auth.uid())` in RLS**
9. **Store authorization data in `app_metadata`** (not `user_metadata`)

### ❌ DON'T

1. **Don't use `getSession()` on server** (can be spoofed with fake cookies)
2. **Don't trust `user_metadata` for authorization** (user can modify it)
3. **Don't create tables without RLS** in exposed schemas
4. **Don't expose service role key** to browser
5. **Don't skip middleware** (required for session refresh)
6. **Don't put supabase client in dependency arrays** (creates new instance each render)
7. **Don't import admin client in client components**

---

## Common Patterns & Examples

### Check if User is Authenticated (Client)

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function Component() {
  const [user, setUser] = useState(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  return user ? <p>Hello {user.email}</p> : <p>Not logged in</p>
}
```

### Update User Profile

```tsx
// Client component
const supabase = createClient()
await supabase
  .from('profiles')
  .update({ display_name: 'New Name' })
  .eq('id', user.id)

// Notify header to refresh
window.dispatchEvent(new Event('profileUpdated'))
```

### Query with RLS

```tsx
// Server component or API route
const supabase = await createClient()
const { data: rooms } = await supabase
  .from('rooms')
  .select('*')
// RLS automatically filters to rooms user is a member of
```

### Bypass RLS (Admin Operations)

```tsx
// API route only
const admin = createAdminClient()
const { data: allRooms } = await admin
  .from('rooms')
  .select('*')
// Returns ALL rooms (bypasses RLS)
```

---

## Migration Instructions

### Applying the Clean Schema Migration

1. **Backup current database** (via Supabase Dashboard)

2. **Run the clean schema migration:**
```bash
# Option 1: Via Supabase CLI (if Docker is running)
supabase db push

# Option 2: Via Supabase Dashboard SQL Editor
# Copy contents of: supabase/migrations/20250120000000_clean_schema_reset.sql
# Paste into SQL Editor and run
```

3. **Verify schema:**
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

4. **Test auth flow:**
- Sign up with a new Google account
- Verify profile is created
- Create a room
- Join a room with share code

---

## Troubleshooting

### "Profile not found" error
- Check if `handle_new_user()` trigger exists
- Check if trigger is enabled
- Manually create profile if needed

### "Infinite recursion" in RLS
- Check for circular dependencies in policies
- Use simple policies without nested subqueries
- See `20250120000000_clean_schema_reset.sql` for working examples

### Session not persisting
- Verify middleware is running (check matcher pattern)
- Check that `await supabase.auth.getUser()` is called in middleware
- Clear cookies and re-authenticate

### RLS blocking legitimate queries
- Check user is actually a room member
- Use admin client for debugging (bypasses RLS)
- Check `auth.uid()` matches user_id in tables

---

## Project Info

- **Supabase Project ID:** `msdemnzgwzaokzjyymgi`
- **Region:** East US (North Virginia)
- **URL:** https://msdemnzgwzaokzjyymgi.supabase.co
- **Deployment:** Vercel

---

**Documentation Sources:**
- https://supabase.com/docs/guides/auth/server-side/nextjs
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/database/postgres/row-level-security

**Last Reviewed:** 2025-01-20
