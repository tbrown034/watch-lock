# WatchLock Development Guide

This guide covers the technical architecture, implementation details, and development workflow for WatchLock.

## Table of Contents
- [Core Architecture](#core-architecture)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [Security & Critical Rules](#security--critical-rules)
- [Component Architecture](#component-architecture)
- [Development Workflow](#development-workflow)
- [Tech Stack](#tech-stack)

## Core Architecture

### The Monotonic Position System

The heart of WatchLock is converting any game position to a single integer for spoiler-free filtering.

```typescript
// MLB Position Encoding: 8 steps per inning
// Top: 0 outs, 1 out, 2 outs, END
// Bottom: 0 outs, 1 out, 2 outs, END
// Plus PREGAME and POSTGAME sentinel values

export interface MlbMeta {
  sport: 'mlb';
  inning: number;        // 1-9+ (extra innings OK)
  half: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2 | 'END';  // 0-2 during play, END at half conclusion
  phase?: 'PREGAME' | 'IN_PROGRESS' | 'POSTGAME';
}

const MLB_PREGAME_POSITION = -1;
const MLB_POSTGAME_POSITION = 999999;

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
// Bottom 1st, END = 7
// Top 2nd, 0 outs = 8
// Postgame = 999999
```

### The ONE Rule: Spoiler Prevention

```typescript
// This single line prevents all spoilers
function filterMessages(messages: Message[], userPos: number): Message[] {
  return messages.filter(m => m.pos <= userPos);
}
```

**Key Principle**: Messages are only visible if `message.pos <= user.pos`. This is enforced server-side.

## Database Schema

### Core Tables

```sql
-- Games/Rooms
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code VARCHAR(6) UNIQUE NOT NULL,
  title VARCHAR(100) NOT NULL,
  sport VARCHAR(10) NOT NULL DEFAULT 'mlb',
  home_team VARCHAR(50) NOT NULL,
  away_team VARCHAR(50) NOT NULL,
  start_time TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  max_members INT DEFAULT 6,
  is_private BOOLEAN DEFAULT true
);

-- Progress tracking (one row per user per game)
CREATE TABLE progress_markers (
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  pos INTEGER NOT NULL DEFAULT 0,
  pos_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, user_id)
);

-- Messages with monotonic position
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  kind VARCHAR(20) DEFAULT 'text',
  pos INTEGER NOT NULL,
  pos_meta JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized indexes
CREATE INDEX idx_messages_game_pos ON messages(game_id, pos, created_at);
CREATE INDEX idx_progress_game_user ON progress_markers(game_id, user_id);
CREATE INDEX idx_games_share_code ON games(share_code);
```

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users see games they're in
CREATE POLICY "Users see games they're in" ON games
  FOR SELECT USING (
    id IN (
      SELECT game_id FROM progress_markers WHERE user_id = auth.uid()
    )
  );

-- Users see their own progress
CREATE POLICY "Users see their progress" ON progress_markers
  FOR ALL USING (user_id = auth.uid());

-- Users see messages in their games
CREATE POLICY "Users see messages in their games" ON messages
  FOR SELECT USING (
    game_id IN (
      SELECT game_id FROM progress_markers WHERE user_id = auth.uid()
    )
  );
```

## API Design

### RESTful Endpoints

```typescript
// Room/Game Management
POST   /api/games                   // Create family room
GET    /api/games                   // List my games
POST   /api/games/join              // Join with share code
GET    /api/games/:id               // Get game details

// Progress
GET    /api/games/:id/progress      // Get my position
PATCH  /api/games/:id/progress      // Update position
  Body: { pos: number, posMeta: MlbMeta }

// Messages
POST   /api/games/:id/messages      // Send reaction
GET    /api/games/:id/messages      // Get visible messages (filtered)

// Schedule (MLB Stats API integration)
GET    /api/games/schedule          // Get today's MLB games
```

### Key API Implementation Examples

#### Message Filtering (Server-Side)
```typescript
// app/api/games/[id]/messages/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = await getCurrentUser();
  const gameId = params.id;

  // Get user's current position
  const progress = await db.query.progress_markers.findFirst({
    where: (pm, { and, eq }) => and(
      eq(pm.gameId, gameId),
      eq(pm.userId, userId)
    )
  });

  const userPos = progress?.pos ?? 0;

  // Filter in SQL, not in JavaScript
  const visibleMessages = await db.execute(sql`
    SELECT m.*, u.username, u.avatar_url
    FROM messages m
    JOIN users u ON m.author_id = u.id
    WHERE m.game_id = ${gameId}
      AND m.pos <= ${userPos}
    ORDER BY m.pos, m.created_at
  `);

  return NextResponse.json({ messages: visibleMessages });
}
```

#### Position Update (Monotonic)
```typescript
// app/api/games/[id]/progress/route.ts
export async function PATCH(req: Request) {
  const { posMeta } = await req.json();
  const userId = await getCurrentUser();
  const gameId = params.id;

  // ALWAYS compute position server-side
  const newPos = encodeMlbPosition(posMeta);

  // UPSERT with condition: only update if newPos > currentPos
  await db.execute(sql`
    INSERT INTO progress_markers (game_id, user_id, pos, pos_meta)
    VALUES (${gameId}, ${userId}, ${newPos}, ${posMeta})
    ON CONFLICT (game_id, user_id)
    DO UPDATE SET
      pos = ${newPos},
      pos_meta = ${posMeta},
      updated_at = NOW()
    WHERE progress_markers.pos < ${newPos}
  `);

  return NextResponse.json({ success: true, pos: newPos });
}
```

## Security & Critical Rules

### 1. Outs Are 0-2 Only (Never 3)
```typescript
// CORRECT
export interface MlbMeta {
  outs: 0 | 1 | 2 | 'END';  // 0-2 during play, END at half conclusion
}

// When 3rd out is recorded, the half ends and we move to:
// - Bottom half if top just ended
// - Next inning if bottom just ended
```

### 2. Always Compute Position Server-Side
```typescript
// NEVER trust client position
export async function POST(req: Request) {
  const { body, posMeta } = await req.json();

  // Server computes position, ignoring any client-provided pos
  const pos = encodeMlbPosition(posMeta);

  await db.insert(messages).values({
    body,
    pos,        // Server-computed, not from client
    posMeta,
    // ...
  });
}
```

### 3. Monotonic Progress (Never Regress)
Progress can only move forward. This is enforced in the database update with a WHERE clause.

### 4. Server-Side Message Filtering
Messages must ALWAYS be filtered in SQL queries, never relying solely on client-side filtering.

### 5. No Spoilers in Notifications
```typescript
// BAD - reveals content
{ title: "Dad: Rizzo crushed that!" }

// GOOD - neutral hint
{ title: "New reactions available", body: "WatchLock" }
```

## Component Architecture

### Project Structure
```
watch-lock/
├── app/
│   ├── (auth)/              # Auth routes (login, signup)
│   ├── (app)/               # Protected app routes
│   │   ├── dashboard/       # Game list
│   │   └── games/
│   │       ├── [id]/        # Game room
│   │       ├── create/      # Create game
│   │       └── join/        # Join with code
│   ├── api/
│   │   └── games/           # API routes
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── game/                # Game-specific components
│   │   ├── GameHeader.tsx
│   │   ├── ProgressSlider.tsx
│   │   ├── MessageFeed.tsx
│   │   └── MessageComposer.tsx
│   ├── ui/                  # shadcn/ui components
│   └── providers/           # Context providers
├── lib/
│   ├── db/                  # Database client
│   ├── position.ts          # Position encoding
│   ├── game-logic.ts        # Filtering logic
│   ├── share-codes.ts       # Code generation
│   └── hooks/               # React hooks
└── types/
    └── index.ts
```

### Key Components

#### ProgressSlider
The hero component that controls what the user sees.

```typescript
// components/game/ProgressSlider.tsx
export function ProgressSlider({ gameId, currentPos, onUpdate }) {
  const [inning, setInning] = useState(1);
  const [half, setHalf] = useState<'TOP' | 'BOTTOM'>('TOP');
  const [outs, setOuts] = useState<0 | 1 | 2 | 'END'>(0);

  const handleUpdate = async () => {
    const posMeta: MlbMeta = { sport: 'mlb', inning, half, outs };
    await fetch(`/api/games/${gameId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ posMeta })
    });
    onUpdate();
  };

  return (
    <div>
      {/* Inning selector 1-9+ */}
      {/* Top/Bottom toggle */}
      {/* Outs: 0, 1, 2, END */}
      {/* [Update Progress] button */}
    </div>
  );
}
```

#### MessageFeed
Displays filtered messages with real-time updates.

```typescript
// components/game/MessageFeed.tsx
export function MessageFeed({ gameId }) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Initial load - already filtered by server
    fetch(`/api/games/${gameId}/messages`)
      .then(res => res.json())
      .then(data => setMessages(data.messages));

    // Real-time subscription
    const channel = supabase
      .channel(`game-${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `game_id=eq.${gameId}`
      }, (payload) => {
        // Re-fetch to ensure proper filtering
        refetch();
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [gameId]);

  return (
    <div className="space-y-4">
      {messages.map(msg => (
        <MessageCard key={msg.id} message={msg} />
      ))}
    </div>
  );
}
```

## Development Workflow

### Setup
```bash
# Clone and install
git clone https://github.com/yourusername/watch-lock.git
cd watch-lock
npm install

# Environment
cp .env.example .env.local
# Add Supabase keys: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# Run migrations
npm run db:push

# Development server
npm run dev
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Spoiler prevention suite
npm run test:spoilers

# Watch mode during development
npm run test:watch
```

### Deployment
```bash
# Build
npm run build

# Preview production build
npm run start

# Deploy to Vercel
vercel deploy --prod
```

## Tech Stack

### Frontend
- **Next.js 15** - App Router, Server Components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Framer Motion** - Animations

### Backend
- **Supabase** - PostgreSQL, Auth, Realtime
- **Drizzle ORM** - Type-safe database queries
- **Vercel** - Edge Functions, Deployment

### State Management
- **Zustand** - Client state
- **React Query** - Server state (future)

### Testing
- **Jest** - Unit tests
- **React Testing Library** - Component tests
- **Playwright** - E2E tests

### Data Sources
- **MLB Stats API** - Free, no-key API for live game data

## Key Development Principles

1. **No Spoilers Ever** - All filtering server-side, bulletproof
2. **Family First** - 2-6 private members, simple UX
3. **Position is King** - The monotonic integer drives everything
4. **Mobile Native** - Touch-first, responsive design
5. **Test Critical Paths** - 100% coverage on spoiler prevention

## Contributing

See [TESTING.md](./TESTING.md) for detailed testing requirements before submitting PRs.

### Critical Tests Required
- Position encoding accuracy
- Message filtering correctness
- Monotonic progress enforcement
- Real-time update filtering
- E2E spoiler prevention

---

**For architecture decisions and rationale, see [PLANNING.md](./PLANNING.md)**
