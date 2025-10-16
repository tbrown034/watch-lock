# WatchLock Development Guide

Technical architecture, critical rules, and API design.

## Table of Contents
- [Position System](#position-system)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [Security Rules](#security-rules)
- [Project Structure](#project-structure)

## Position System

### MLB Encoding: 8 Steps Per Inning

```typescript
export interface MlbMeta {
  sport: 'mlb';
  inning: number;              // 1-9+ (extra innings allowed)
  half: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2 | 'END';     // 0-2 during play, END at half conclusion
  phase?: 'PREGAME' | 'IN_PROGRESS' | 'POSTGAME';
}

const MLB_PREGAME_POSITION = -1;
const MLB_POSTGAME_POSITION = 1_000_000;

function encodeMlbPosition(meta: MlbMeta): number {
  if (meta.phase === 'PREGAME') return MLB_PREGAME_POSITION;
  if (meta.phase === 'POSTGAME') return MLB_POSTGAME_POSITION;

  const inningBase = (meta.inning - 1) * 8;
  const halfOffset = meta.half === 'TOP' ? 0 : 4;
  const outsOffset = meta.outs === 'END' ? 3 : meta.outs;
  return inningBase + halfOffset + outsOffset;
}

// Examples:
// Pregame = -1
// Top 1st, 0 outs = 0
// Top 1st, 1 out = 1
// Top 1st, 2 outs = 2
// Top 1st, END = 3
// Bottom 1st, 0 outs = 4
// Bottom 1st, 1 out = 5
// Bottom 1st, 2 outs = 6
// Bottom 1st, END = 7
// Top 2nd, 0 outs = 8
// Postgame = 1_000_000
```

### The Filtering Rule

```typescript
// This single line prevents ALL spoilers
function isMessageVisible(messagePos: number, userPos: number): boolean {
  return messagePos <= userPos;
}

// Applied server-side in SQL
SELECT * FROM messages
WHERE game_id = $1
  AND pos <= (SELECT pos FROM progress_markers WHERE user_id = $2)
ORDER BY pos, created_at;
```

## Database Schema

### Core Tables

```sql
-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  share_code VARCHAR(6) UNIQUE NOT NULL,
  max_members INT DEFAULT 10,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  sport TEXT NOT NULL DEFAULT 'mlb',
  title TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  external_id TEXT,  -- MLB API game ID
  is_live BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Progress Markers (Composite PK)
CREATE TABLE progress_markers (
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pos INT NOT NULL DEFAULT 0,
  pos_meta JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) <= 280),
  pos INT NOT NULL,
  pos_meta JSONB NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical Indexes
CREATE INDEX idx_messages_game_pos ON messages(game_id, pos, created_at);
CREATE INDEX idx_progress_markers_game_user ON progress_markers(game_id, user_id);
CREATE INDEX idx_rooms_share_code ON rooms(share_code);
CREATE INDEX idx_games_room_id ON games(room_id);
```

### Row Level Security

```sql
-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users see rooms they're members of
CREATE POLICY "Users can view their rooms" ON rooms FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM room_members
    WHERE room_members.room_id = rooms.id
    AND room_members.user_id = auth.uid()
  )
);

-- Users see games in their rooms
CREATE POLICY "Users can view games in their rooms" ON games FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM room_members
    WHERE room_members.room_id = games.room_id
    AND room_members.user_id = auth.uid()
  )
);

-- THE CRITICAL POLICY: Spoiler prevention
CREATE POLICY "Users can view messages at or before their position"
ON messages FOR SELECT USING (
  NOT is_deleted
  AND EXISTS (
    SELECT 1 FROM progress_markers pm
    WHERE pm.game_id = messages.game_id
    AND pm.user_id = auth.uid()
    AND messages.pos <= pm.pos  -- THE SPOILER FILTER
  )
);

-- Users can only update their own progress
CREATE POLICY "Users can update own progress"
ON progress_markers FOR ALL USING (user_id = auth.uid());
```

## API Design

### RESTful Endpoints

```
Room Management:
POST   /api/rooms/create              Create room + game
POST   /api/rooms/join                Join via share code
DELETE /api/rooms/[roomId]            Delete room (owner only)
GET    /api/rooms/[roomId]/members    Get member list

Game Management:
GET    /api/games/schedule             Get today's MLB games
GET    /api/games/[id]/room            Get room info for game
GET    /api/games/[id]/state           Get live game state (MLB API)
GET    /api/games/stats                Get room counts per game

Progress Tracking:
POST   /api/games/[id]/position        Update user position

Messages:
GET    /api/games/[id]/messages        Get filtered messages
POST   /api/games/[id]/messages        Send message

User:
GET    /api/users/me/rooms             Get my rooms
GET    /api/users/[userId]/profile     Get user profile
```

### Key Implementation Patterns

#### 1. Server-Side Position Computation
```typescript
// ALWAYS compute position on server
export async function POST(request: Request) {
  const { body, posMeta } = await request.json();

  // Server computes position, ignoring any client pos
  const pos = encodeMlbPosition(posMeta);

  await supabase.from('messages').insert({
    body,
    pos,        // Server-computed
    pos_meta: posMeta,
    author_id: user.id,
    game_id: gameId
  });
}
```

#### 2. Monotonic Progress Updates
```typescript
// Only update if moving forward
await supabase
  .from('progress_markers')
  .upsert({
    game_id: gameId,
    user_id: userId,
    pos: newPos,
    pos_meta: newPosMeta,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'game_id,user_id'
  });
```

#### 3. Message Filtering
```typescript
// RLS automatically filters, but we verify access first
const { data: membership } = await supabase
  .from('room_members')
  .select('id')
  .eq('room_id', roomId)
  .eq('user_id', user.id)
  .single();

if (!membership) {
  return NextResponse.json({ error: 'Not a room member' }, { status: 403 });
}

// Fetch messages - RLS filters based on user's position
const { data: messages } = await supabase
  .from('messages')
  .select(`
    id,
    body,
    pos,
    pos_meta,
    created_at,
    profiles:author_id (username, avatar_url)
  `)
  .eq('game_id', gameId)
  .eq('is_deleted', false)
  .order('pos', { ascending: true });
```

## Security Rules

### 1. Outs Are 0-2 Only (Never 3)
```typescript
// CORRECT
export interface MlbMeta {
  outs: 0 | 1 | 2 | 'END';
}

// When 3rd out is recorded, move to END state
// Then advance to next half/inning
```

### 2. Always Compute Position Server-Side
Never trust client-provided `pos` value. Always recompute from `posMeta`.

### 3. Monotonic Progress
Progress can only move forward. Use upsert with proper conflict resolution.

### 4. RLS Enforcement
All message filtering happens at database level via RLS policies. Client-side filtering is for UX only.

### 5. No Spoilers in Presence/Notifications
```typescript
// BAD - reveals position
"Dad is at Top 7th"

// GOOD - obfuscated
"New reactions available"
```

### 6. Share Code Security
- 6 characters, alphanumeric (no O/0/I/1)
- Validated server-side
- Unique constraint in database
- Rate limiting recommended (not yet implemented)

## Project Structure

```
watch-lock/
├── app/
│   ├── api/                    # API routes
│   │   ├── rooms/              # Room management
│   │   ├── games/              # Game + message APIs
│   │   └── users/              # User APIs
│   ├── auth/callback/          # OAuth callback
│   ├── games/[id]/             # Game room page
│   ├── games/page.tsx          # Game browser
│   └── profile/                # User profiles
│
├── components/
│   ├── game/                   # Game-specific UI
│   │   ├── MessageFeed.tsx
│   │   ├── MessageComposer.tsx
│   │   ├── ProgressSlider.tsx
│   │   └── GameStateCard.tsx
│   ├── room/                   # Room UI
│   └── shared/                 # App-wide components
│
├── lib/
│   ├── position.ts             # Position encoding/decoding
│   ├── services/               # External API clients
│   │   ├── mlbSchedule.ts
│   │   ├── mlbGameState.ts
│   │   └── nflSchedule.ts
│   ├── supabase/               # Supabase clients
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client
│   └── db/schema.ts            # Drizzle schema
│
├── supabase/migrations/        # Database migrations
└── types/                      # TypeScript types
```

## Critical Code Paths

### Message Send Flow
1. User composes message at current position
2. Client sends `{ body, posMeta }` to API
3. Server authenticates user
4. Server validates room membership
5. **Server computes `pos` from `posMeta`**
6. Server inserts message with computed `pos`
7. RLS allows insert (user is room member)
8. Other users poll/subscribe for new messages
9. **RLS filters messages by each user's position**

### Position Update Flow
1. User adjusts slider to new position
2. Client sends `{ pos, posMeta }` to API
3. Server authenticates user
4. Server validates room membership
5. **Server recomputes `pos` from `posMeta`** (ignores client pos)
6. Server upserts progress_markers
7. Client refetches messages
8. **RLS returns only messages where pos <= user.pos**

---

**See [TYPES.md](./TYPES.md) for type definitions.**
