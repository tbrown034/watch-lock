# 🔒 WatchLock

**Share the highs without the spoilers.**

Post your reactions now; your people see them only when they catch up.

## The Problem

You're watching the Cubs game live. Your dad is watching it on delay. You want to text him about that amazing home run, but you can't without spoiling it. Current messaging apps don't understand game time vs. real time.

## The Solution

Every message is anchored to a game position (converted to a monotonic integer). Users only see messages where `message.pos <= user.pos`. Simple rule, perfect spoiler prevention.

## Core Features

- **Private Rooms** - 2-10 members, share code required
- **MLB Support** - Full inning/half/outs granularity (pregame, end-of-half, postgame)
- **Perfect Filtering** - Server-side enforcement of `message.pos <= user.pos`
- **Live Sync** - One-tap sync from free MLB Stats API
- **Mobile First** - Touch-optimized for couch viewing
- **Real-time** - 2-second polling (WebSocket upgrade planned)

## Technical Architecture

### Monotonic Position System

The core innovation: converting any game state to a single integer.

```typescript
// MLB: 8 steps per inning (Top: 0,1,2,END • Bottom: 0,1,2,END)
function encodeMlbPosition(meta: MlbMeta): number {
  if (meta.phase === 'PREGAME') return -1;
  if (meta.phase === 'POSTGAME') return 1000000;

  const inningBase = (meta.inning - 1) * 8;
  const halfOffset = meta.half === 'TOP' ? 0 : 4;
  const outsOffset = meta.outs === 'END' ? 3 : meta.outs;
  return inningBase + halfOffset + outsOffset;
}

// The ONE rule that prevents all spoilers
function filterMessages(messages: Message[], userPos: number): Message[] {
  return messages.filter(m => m.pos <= userPos);
}
```

**Examples:**
- Pregame: -1
- Top 1st, 0 outs: 0
- Top 1st, END: 3
- Bottom 1st, 2 outs: 6
- Top 2nd, 0 outs: 8
- Postgame: 1000000

### Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Deployment**: Vercel
- **Data Source**: MLB Stats API (free, no-key)

### Database Schema (Simplified)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  game_id UUID NOT NULL,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  pos INTEGER NOT NULL,        -- The magic number
  pos_meta JSONB NOT NULL,     -- Sport-specific details
  created_at TIMESTAMPTZ
);

CREATE TABLE progress_markers (
  game_id UUID NOT NULL,
  user_id UUID NOT NULL,
  pos INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (game_id, user_id)
);

-- Critical index for filtering
CREATE INDEX idx_messages_game_pos ON messages(game_id, pos, created_at);
```

## Key Design Decisions

### 1. Outs Are 0-2 Only (Never 3)
When the 3rd out is recorded, we move to END state, then advance to next half/inning. This matches real baseball flow.

### 2. Server-Side Position Computation
Client sends `posMeta`, server computes `pos`. Never trust client for the position integer.

### 3. Row Level Security (RLS)
Database enforces filtering - even if you hack the frontend, RLS blocks spoilers.

```sql
CREATE POLICY "Users can view messages at or before their position"
ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM progress_markers pm
    WHERE pm.game_id = messages.game_id
    AND pm.user_id = auth.uid()
    AND messages.pos <= pm.pos  -- THE CRITICAL FILTER
  )
);
```

### 4. Monotonic Progress Updates
Progress only moves forward - enforced in SQL with `WHERE progress_markers.pos < new_pos`.

### 5. Spoiler-Free Notifications
Never reveal content or position. Neutral hints only: "New reactions available"

## Development Setup

```bash
git clone https://github.com/yourusername/watch-lock.git
cd watch-lock
npm install

# Add Supabase keys to .env.local
npm run dev
```

## Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Implementation details & API design
- [TYPES.md](./TYPES.md) - TypeScript type reference

## Key Principles

1. **No Spoilers Ever** - Server-side filtering, bulletproof RLS
2. **Family First** - Private rooms, simple UX
3. **Position is King** - Monotonic integer drives everything
4. **Mobile Native** - Touch-first design
5. **Trust by Design** - RLS enforces security at database level

---

**Built with love so families can share the game, not the spoilers.** ⚾
