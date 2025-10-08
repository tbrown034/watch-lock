# 🔒 WatchLock Security & Architecture Decisions

## Critical Security Rules

### 1. ✅ Progress Math (MLB)
```typescript
// CORRECT: outs are 0-2 only
export interface MlbMeta {
  sport: 'mlb';
  inning: number;        // 1-9+ (extra innings OK)
  half: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2;      // NEVER 3
}

// Position encoding: 6 positions per inning
function encodeMlbPosition(meta: MlbMeta): number {
  // Inning 1, Top, 0 outs = 0
  // Inning 1, Top, 1 out  = 1
  // Inning 1, Top, 2 outs = 2
  // Inning 1, Bot, 0 outs = 3
  // Inning 1, Bot, 1 out  = 4
  // Inning 1, Bot, 2 outs = 5
  // Inning 2, Top, 0 outs = 6
  return (meta.inning - 1) * 6 + (meta.half === 'TOP' ? 0 : 3) + meta.outs;
}
```

### 2. ✅ Always Compute Position Server-Side
```typescript
// NEVER trust client position
// app/api/messages/route.ts
export async function POST(req: Request) {
  const { body, posMeta } = await req.json();

  // ALWAYS recompute position from metadata
  const pos = encodeMlbPosition(posMeta);  // Server computes

  // Insert with server-computed position
  await db.insert(messages).values({
    body,
    pos,        // Server-computed, not from client
    posMeta,
    // ...
  });
}
```

### 3. ✅ Monotonic Progress (Never Regress)
```typescript
// Progress can only move forward
// app/api/progress/route.ts
export async function PATCH(req: Request) {
  const { posMeta } = await req.json();
  const userId = await getCurrentUser();

  // Compute new position
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
    WHERE progress_markers.pos < ${newPos}  -- Only if moving forward
  `);
}
```

### 4. ✅ Server-Side Message Filtering
```typescript
// NEVER filter on client alone
// app/api/messages/[gameId]/route.ts
export async function GET(req: Request) {
  const userId = await getCurrentUser();
  const gameId = params.gameId;

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
      AND m.pos <= ${userPos}  -- Server-side filter
    ORDER BY m.pos, m.created_at
  `);

  return NextResponse.json({ messages: visibleMessages });
}
```

## Database Choice: Supabase vs Alternatives

### Do we NEED Supabase? No, but...

**Supabase gives us:**
- ✅ Hosted PostgreSQL (no setup)
- ✅ Built-in auth (email/password ready)
- ✅ Real-time subscriptions (WebSockets managed)
- ✅ Row Level Security (RLS)
- ✅ Free tier generous for MVP
- ✅ 5-minute setup

**Without Supabase, we'd need:**

### Option 1: Vercel Stack (Recommended Alternative)
```typescript
// Simpler, all on Vercel
- Database: Vercel Postgres (Neon under the hood)
- Auth: NextAuth.js with credentials provider
- Real-time: Server-Sent Events or Pusher
- Hosting: Vercel

// Pros: Single vendor, great DX
// Cons: Need to wire up auth & realtime ourselves
```

### Option 2: Local First (Fastest MVP)
```typescript
// For true rapid prototyping
- Database: SQLite with Drizzle ORM
- Auth: Simple JWT with cookies
- Real-time: Polling or SSE
- Hosting: Vercel

// Pros: Zero external dependencies, works offline
// Cons: Not production-ready, no real-time
```

### Option 3: Modern Stack
```typescript
// Best long-term but more setup
- Database: Neon or PlanetScale
- Auth: Clerk or Auth.js
- Real-time: Pusher or Ably
- Hosting: Vercel

// Pros: Best in class for each piece
// Cons: Multiple services to manage
```

## My Recommendation

**For THIS MVP: Use Vercel Postgres + NextAuth + Polling**

Why:
1. Single vendor (Vercel)
2. Free tier covers MVP
3. NextAuth is battle-tested
4. Polling is simple and sufficient for MVP
5. Can add Pusher later for real-time

## Implementation with Vercel Stack

### 1. Database Setup
```bash
npm install @vercel/postgres drizzle-orm
npm install -D drizzle-kit @types/pg
```

### 2. Schema with Drizzle
```typescript
// lib/db/schema.ts
import { pgTable, uuid, text, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  shareCode: text('share_code').notNull().unique(),
  maxMembers: integer('max_members').default(6),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').notNull(),
  authorId: uuid('author_id').notNull(),
  body: text('body').notNull(),
  pos: integer('pos').notNull(),  // THE CRITICAL FIELD
  posMeta: json('pos_meta').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const progressMarkers = pgTable('progress_markers', {
  gameId: uuid('game_id').notNull(),
  userId: uuid('user_id').notNull(),
  pos: integer('pos').notNull().default(0),
  posMeta: json('pos_meta').notNull().default({}),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  pk: primaryKey(table.gameId, table.userId)
}));
```

### 3. NextAuth Setup
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Check user in database
        // Return user object or null
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 4. Simple Polling for MVP
```typescript
// hooks/useMessages.ts
export function useMessages(gameId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Poll every 2 seconds for MVP
    const interval = setInterval(async () => {
      const res = await fetch(`/api/games/${gameId}/messages`);
      const data = await res.json();
      setMessages(data.messages);  // Already filtered server-side
    }, 2000);

    return () => clearInterval(interval);
  }, [gameId]);

  return messages;
}
```

## Summary

**Critical Security Rules:**
1. ✅ Outs are 0-2 only (never 3)
2. ✅ Always compute pos server-side
3. ✅ Progress only moves forward (monotonic)
4. ✅ Filter messages in SQL, not client

**Tech Stack for MVP:**
- Vercel Postgres (free, simple)
- NextAuth (battle-tested auth)
- Polling for updates (simple, works)
- Add real-time later if needed

This approach gets us to MVP fastest while maintaining security.