# Database Migration Explained (Plain English)
**For**: Trevor, so you can defend every line
**File**: `supabase_migration.sql`

---

## Part 1: The Tables (Data Structure)

### Table 1: `profiles`

**Purpose**: Store extra user info beyond what Supabase auth gives us

**Why we need it**: Supabase auth only stores email, but we want usernames and avatars.

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
```

**Translation**:
- `CREATE TABLE IF NOT EXISTS` = Make this table, but skip if it already exists (safe to re-run)
- `public.profiles` = Create in the "public" schema (Supabase's default)
- `id UUID` = User ID, formatted as UUID (unique identifier like "abc-123-def")
- `REFERENCES auth.users(id)` = This ID MUST match a user in Supabase's auth table (foreign key)
- `ON DELETE CASCADE` = If the auth user is deleted, auto-delete their profile too
- `PRIMARY KEY` = This field is the main identifier (no duplicates allowed)

**The columns**:
```sql
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
```

- `TEXT` = String of any length
- `NOT NULL` = This field is required
- `TIMESTAMPTZ` = Timestamp with timezone (like "2025-10-12 20:45:00 UTC")
- `DEFAULT NOW()` = Auto-fill with current time

**The constraint**:
```sql
  CONSTRAINT username_min_length CHECK (char_length(username) >= 2)
```
- `CONSTRAINT` = A rule that's enforced
- `CHECK` = Validate before inserting
- Translation: "Username must be at least 2 characters"

---

### Table 2: `rooms`

**Purpose**: A "room" is a watch party (group of people watching together)

**Why we need it**: You can't have multi-user without a concept of "group"

```sql
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  share_code VARCHAR(6) UNIQUE NOT NULL,
```

**Translation**:
- `DEFAULT gen_random_uuid()` = Auto-generate a random ID when row is created
- `VARCHAR(6)` = Text with max 6 characters
- `UNIQUE` = No two rooms can have the same share code

**Why share codes?** So friends can join your room by typing "ABC123" instead of copying a long URL.

**Key columns**:
```sql
  max_members INT DEFAULT 10 NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_archived BOOLEAN DEFAULT FALSE NOT NULL,
  archived_at TIMESTAMPTZ
```

- `INT` = Integer (whole number)
- `BOOLEAN` = True or false
- `created_by` = Who made this room (links to auth.users)

---

### Table 3: `room_members`

**Purpose**: Track who is in which room

**Why we need it**: A room has many users, a user can be in many rooms (many-to-many relationship)

```sql
CREATE TABLE IF NOT EXISTS public.room_members (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member' NOT NULL,
```

**Translation**:
- `CHECK (role IN (...))` = Role must be one of these three options
- If room is deleted, auto-delete all members (CASCADE)
- If user is deleted, remove them from all rooms (CASCADE)

**The unique constraint**:
```sql
  UNIQUE(room_id, user_id)
```
Translation: "A user can only join a room once" (no duplicate memberships)

---

### Table 4: `games`

**Purpose**: Represents a specific sporting event (e.g., Yankees @ Red Sox on Oct 12)

**Why we need it**: A room watches a game. This links them.

```sql
CREATE TABLE IF NOT EXISTS public.games (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  sport TEXT CHECK (sport IN ('mlb', 'nba', 'nfl')) DEFAULT 'mlb' NOT NULL,
  title TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  external_id TEXT, -- e.g., "mlb-746532"
```

**Key fields**:
- `external_id` = The MLB API game ID (so we can fetch live data)
- `scheduled_start` = When game is supposed to start
- `actual_start` / `actual_end` = When it really started/ended

**Why separate scheduled vs actual?** Games get delayed by weather, etc.

---

### Table 5: `progress_markers` (THE MOST IMPORTANT TABLE)

**Purpose**: Track where EACH USER is in EACH GAME

**Why we need it**: This is how we know what messages to show you!

```sql
CREATE TABLE IF NOT EXISTS public.progress_markers (
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  pos INT DEFAULT 0 NOT NULL,
  pos_meta JSONB NOT NULL DEFAULT '{}',
```

**The magic fields**:
- `pos` = A single integer representing position (e.g., 31 = Top 3rd, 1 out)
- `pos_meta` = JSON with details like `{"inning": 3, "half": "TOP", "outs": 1}`

**Why store it twice?**
- `pos` = Fast comparisons (is 31 <= 40? Yes, so show this message)
- `pos_meta` = Human-readable details for UI ("Top 3rd, 1 out")

**The composite primary key**:
```sql
  PRIMARY KEY (game_id, user_id)
```
Translation: "Each user has ONE position per game" (can't have duplicates)

---

### Table 6: `messages`

**Purpose**: Store messages users post, locked to game positions

**Why we need it**: The core feature - spoiler-locked messages!

```sql
CREATE TABLE IF NOT EXISTS public.messages (
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) <= 280),

  pos INT NOT NULL,
  pos_meta JSONB NOT NULL,
```

**Key constraints**:
- `CHECK (char_length(body) <= 280)` = Twitter-style limit (keeps messages snappy)
- `pos` / `pos_meta` = Where the author was when they posted

**Soft deletion**:
```sql
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
```
Translation: "Don't actually delete messages, just mark them as deleted" (can undo later)

---

## Part 2: Indexes (Performance)

**What are indexes?** Think of them like a book's index - helps find things fast.

```sql
CREATE INDEX IF NOT EXISTS idx_rooms_share_code ON public.rooms(share_code);
```

**Translation**: "When someone searches for share code 'ABC123', use this index to find it instantly instead of checking every row"

**Without this index**: Searching 1 million rooms = check all 1 million
**With this index**: Searching 1 million rooms = check ~20 (binary search)

**Where we use indexes**:
- `share_code` = Users join rooms by code (needs to be fast)
- `game_id, pos` = Filter messages by game and position (happens constantly)
- `room_id` = Find all games in a room
- `user_id` = Find all rooms a user is in

---

## Part 3: Row Level Security (RLS)

**What is RLS?** Security built into the database itself.

**Why it matters**: Even if someone hacks your API, they can't bypass RLS.

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

**Translation**: "From now on, NOBODY can read/write this table unless a policy allows it"

### Example Policy: Messages Spoiler Filter

```sql
CREATE POLICY "Users can view messages at or before their position"
ON public.messages FOR SELECT
USING (
  NOT is_deleted
  AND EXISTS (
    SELECT 1 FROM public.progress_markers pm
    WHERE pm.game_id = messages.game_id
    AND pm.user_id = auth.uid()
    AND messages.pos <= pm.pos
  )
);
```

**Plain English**:
- "When someone tries to SELECT (read) messages..."
- "Only show them messages where:"
  - The message isn't deleted
  - They're in the game (have a progress marker)
  - The message position <= their current position

**Example**:
- Alice is at position 31 (Top 3rd, 1 out)
- Bob posted at position 40 (Top 4th, 0 outs)
- Alice tries to read Bob's message
- Database checks: 40 <= 31? NO → Message hidden ✅

**This is enforced at the DATABASE level** - your app code can't mess it up!

---

## Part 4: Triggers (Automation)

**What are triggers?** Code that runs automatically when something happens.

### Trigger 1: Auto-create profile on signup

```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

**Translation**:
- "AFTER a new row is INSERTed into auth.users..."
- "FOR EACH ROW that's added..."
- "Run the function handle_new_user()"

**What the function does**:
1. Get user's Google name or email
2. Clean it (remove spaces, special chars)
3. Check if username already exists
4. If yes, append a number ("johndoe2")
5. Insert into profiles table

**Why this matters**: Users get a profile automatically on signup. No extra API call needed.

---

### Trigger 2: Auto-add creator to room

```sql
CREATE TRIGGER on_room_created
AFTER INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_room();
```

**What it does**:
- When you create a room, it auto-adds you to `room_members` with role="owner"

**Why?** Prevents the bug where you create a room but aren't a member of it!

---

### Trigger 3: Auto-archive room when game ends

```sql
CREATE TRIGGER on_game_ended
AFTER UPDATE ON public.games
FOR EACH ROW
WHEN (NEW.actual_end IS NOT NULL AND OLD.actual_end IS NULL)
EXECUTE FUNCTION auto_archive_room_on_game_end();
```

**Translation**:
- "When a game is UPDATEd..."
- "And the actual_end field changes from NULL to a date..."
- "Check if all games in this room are done"
- "If yes, mark room as archived"

**Why?** Keeps your rooms list clean. Old games auto-archive.

---

## Part 5: Helper Functions

### Generate Share Code

```sql
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**Plain English**:
- Pick 6 random characters from this alphabet
- Excludes confusing characters (0/O, 1/I)
- Returns something like "K3PQR7"

**How you'll use it**:
```sql
INSERT INTO rooms (share_code) VALUES (generate_share_code());
```

---

## How to Run This Migration

### Step-by-Step (Supabase Dashboard)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Click your "watchlock" project

2. **Open SQL Editor**
   - Left sidebar → **SQL Editor**
   - Click **New Query**

3. **Copy the migration**
   - Open `supabase_migration.sql` locally
   - Select all (Cmd+A)
   - Copy (Cmd+C)

4. **Paste and run**
   - Paste into Supabase SQL Editor
   - Click **Run** button (bottom right)

5. **Verify success**
   - Left sidebar → **Table Editor**
   - You should see: profiles, rooms, room_members, games, progress_markers, messages

---

## How to Verify It Worked

### Check Tables Exist

1. Go to **Table Editor** in Supabase
2. You should see 6 tables:
   - profiles
   - rooms
   - room_members
   - games
   - progress_markers
   - messages

### Check RLS is Enabled

1. Click on any table (e.g., "messages")
2. Top right: Look for "RLS enabled" badge

### Check Policies Exist

1. Click "messages" table
2. Click "Policies" tab
3. You should see:
   - "Users can view messages at or before their position"
   - "Room members can insert messages"
   - "Authors can delete own messages"

### Check Triggers Exist

1. Go to **Database** → **Functions**
2. You should see:
   - `handle_new_user`
   - `handle_new_room`
   - `auto_archive_room_on_game_end`
   - `generate_share_code`

---

## Common Questions

### Q: What if I need to change something later?

**A:** Write a new migration file (e.g., `migration_002.sql`) with just the changes:

```sql
-- Add a new column
ALTER TABLE public.rooms ADD COLUMN theme TEXT;

-- Add a new index
CREATE INDEX idx_rooms_theme ON public.rooms(theme);
```

### Q: Can I undo a migration?

**A:** Yes, but manually. Example:

```sql
-- Remove a table
DROP TABLE IF EXISTS public.rooms CASCADE;

-- Remove a column
ALTER TABLE public.rooms DROP COLUMN theme;
```

**Pro tip**: Test migrations on a dev database first!

### Q: What if the migration fails halfway through?

**A:** Postgres uses transactions - if ANY part fails, EVERYTHING rolls back. Your database stays clean.

### Q: Do I need to run this on my local machine?

**A:** No! Supabase is your database. You just run it once in their dashboard. Your Next.js app connects to it.

---

## What This Enables

Once this migration runs, your app can:

✅ Store users (profiles auto-created on signup)
✅ Create rooms with share codes
✅ Track who's in which room
✅ Link MLB games to rooms
✅ Track each user's position in each game
✅ Store messages locked to positions
✅ **Automatically hide spoilers** via RLS
✅ Auto-archive finished games
✅ Prevent invalid data (constraints)
✅ Query data fast (indexes)

---

## Key Takeaways

1. **Migrations = database structure changes** (run once)
2. **Tables = where data lives** (like spreadsheet tabs)
3. **Indexes = make queries fast** (like a book's index)
4. **RLS = security at the DB level** (can't be bypassed)
5. **Triggers = automation** (no extra code needed)
6. **Functions = reusable logic** (like JavaScript functions, but in SQL)

You now understand every line! Ready to run it?
