# WatchLock - Complete Implementation Plan

## 🎯 Mission Statement
**Share the highs without the spoilers.**

WatchLock is a trust-first, family-oriented messaging system for sports fans. Post your reactions now; your people see them only when they catch up.

## 🏆 Strategic Positioning

### Core Value Proposition
- **The Family Mode Niche**: 2-6 private members, zero public rooms, zero scores anywhere
- **Brand Promise**: "Share the moment without ruining it"
- **Target Users**: Family members and close friends watching games at different times

### Competitive Moat
1. **Monotonic Position System**: Single integer unlocking rule that works across all sports
2. **No-Leak Presence**: Hidden by default with obfuscated hints
3. **Progress Granularity**: Sport-specific precision (MLB: inning/half/outs, NBA: period/clock, NFL: quarter/clock)
4. **Family-First UX**: Simple enough for grandma, powerful enough for superfans

## 📐 System Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components + Framer Motion
- **Database**: Supabase (PostgreSQL) or Neon
- **Auth**: Supabase Auth or Better Auth
- **Real-time**: Supabase Realtime subscriptions
- **State Management**: Zustand
- **Testing**: Jest + React Testing Library + Playwright
- **Deployment**: Vercel Edge Functions
- **Future**: Twilio for SMS integration

### Core Technical Innovation: Monotonic Position System

```typescript
// The heart of WatchLock - converting any game position to a single integer
export type SportPosition = MlbPosition | NbaPosition | NflPosition;

export interface MlbPosition {
  sport: 'mlb';
  inning: number;
  half: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2;      // Only 0-2, never 3
}

// MLB: 6 steps per inning (Top 0-2 outs, Bottom 0-2 outs)
export function encodeMlbPosition(pos: MlbPosition): number {
  const inningBase = (pos.inning - 1) * 6;
  const halfOffset = pos.half === 'TOP' ? 0 : 3;
  return inningBase + halfOffset + pos.outs;
}

// Examples:
// Top 1st, 0 outs = 0
// Top 1st, 1 out = 1
// Bottom 1st, 0 outs = 3
// Top 2nd, 0 outs = 6
// Bottom 9th, 2 outs = 53

// The universal rule: show message if message.pos <= user.pos
```

## 🗄️ Database Schema (Optimized)

```sql
-- Users table (managed by Supabase Auth)

-- Games table
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

  -- Settings
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
  kind VARCHAR(20) DEFAULT 'text', -- text, emoji, reaction
  pos INTEGER NOT NULL,
  pos_meta JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimized indexes
CREATE INDEX idx_messages_game_pos ON messages(game_id, pos, created_at);
CREATE INDEX idx_progress_game_user ON progress_markers(game_id, user_id);

-- Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users see games they're in" ON games
  FOR SELECT USING (
    id IN (
      SELECT game_id FROM progress_markers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users see their progress" ON progress_markers
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users see messages in their games" ON messages
  FOR SELECT USING (
    game_id IN (
      SELECT game_id FROM progress_markers WHERE user_id = auth.uid()
    )
  );
```

## 🎨 User Interface Design

### Design Principles
1. **Family-Friendly**: Large touch targets, clear text, simple navigation
2. **No Spoilers Ever**: No previews, no counts, no hints about future content
3. **Progress-First**: The slider is the hero element
4. **Mobile-Native**: Optimized for couch viewing

### Screen Layouts

#### 1. Welcome Screen (`/`)
```
┌─────────────────────────────────┐
│      🔒 WatchLock                │
│                                  │
│  Share the highs                 │
│  without the spoilers            │
│                                  │
│  For families who watch          │
│  games together, apart           │
│                                  │
│  [Start Free] [How it Works]     │
└─────────────────────────────────┘
```

#### 2. Family Room Hub (`/rooms`)
```
┌─────────────────────────────────┐
│  Your Family Rooms    [@username]│
├─────────────────────────────────┤
│  ┌────────────────────────┐     │
│  │ 🏠 The Brown Family     │     │
│  │ Cubs @ Cardinals        │     │
│  │ 3 members • Join: ABC1  │     │
│  └────────────────────────┘     │
│                                  │
│  [+ New Room] [Join Room]        │
└─────────────────────────────────┘
```

#### 3. Game Room (`/games/[id]`)
```
┌─────────────────────────────────┐
│  Cubs @ Cardinals                │
│  Brown Family Room • Code: ABC1   │
├─────────────────────────────────┤
│  📍 Your Progress                │
│  ╔═══════════════════════════╗  │
│  ║ Top 7th • 2 outs          ║  │
│  ║ [█████████░░░░░░░░░]      ║  │
│  ╚═══════════════════════════╝  │
├─────────────────────────────────┤
│  💬 Reactions                    │
│  ┌────────────────────────┐     │
│  │ Dad • T5 1 out          │     │
│  │ "Rizzo crushed that!"   │     │
│  └────────────────────────┘     │
│  ┌────────────────────────┐     │
│  │ You • B6 0 outs         │     │
│  │ "This ump is blind 🙄"  │     │
│  └────────────────────────┘     │
├─────────────────────────────────┤
│  [Your reaction...] [Send]       │
└─────────────────────────────────┘
```

### Component Architecture
```
App
├── Providers
│   ├── AuthProvider
│   ├── RealtimeProvider
│   └── NotificationProvider
├── Layouts
│   ├── PublicLayout
│   └── FamilyLayout
└── Features
    ├── Onboarding
    │   ├── Welcome
    │   └── CreateFirstRoom
    ├── Rooms
    │   ├── RoomList
    │   ├── CreateRoom
    │   └── JoinRoom
    └── Game
        ├── GameHeader
        ├── ProgressControl
        │   ├── SportSelector
        │   └── PositionSlider
        ├── MessageFeed
        │   ├── MessageCard
        │   └── PositionMarker
        └── MessageComposer
```

## 🔌 API Design

### RESTful Endpoints

```typescript
// Room Management
POST   /api/rooms                   // Create family room
GET    /api/rooms                   // List my rooms
POST   /api/rooms/join              // Join with code
GET    /api/rooms/:id               // Get room details

// Game Management
POST   /api/rooms/:id/games         // Start new game
GET    /api/rooms/:id/games/active  // Get active game
PATCH  /api/games/:id/end           // End game

// Progress
GET    /api/games/:id/progress      // Get my position
PATCH  /api/games/:id/progress      // Update position
  Body: { pos: number, posMeta: object }

// Messages
POST   /api/games/:id/messages      // Send reaction
GET    /api/games/:id/messages      // Get visible messages
  Response: filtered where message.pos <= user.pos

// Real-time Subscriptions
WS     rooms:{id}:messages           // New reactions
WS     rooms:{id}:progress           // Progress updates
WS     rooms:{id}:presence           // Who's watching (obfuscated)
```

### Core Business Logic

```typescript
// lib/game-logic.ts
export class GamePosition {
  constructor(
    private sport: 'mlb' | 'nba' | 'nfl',
    private metadata: any
  ) {}

  // Convert any position to monotonic integer
  toInteger(): number {
    switch (this.sport) {
      case 'mlb':
        return this.encodeMlb(this.metadata);
      case 'nba':
        return this.encodeNba(this.metadata);
      case 'nfl':
        return this.encodeNfl(this.metadata);
    }
  }

  // Format for display
  toString(): string {
    switch (this.sport) {
      case 'mlb':
        const { inning, half, outs } = this.metadata;
        return `${half === 'TOP' ? 'T' : 'B'}${inning} • ${outs} ${outs === 1 ? 'out' : 'outs'}`;
      // ... other sports
    }
  }

  private encodeMlb({ inning, half, outs }): number {
    return (inning - 1) * 6 + (half === 'TOP' ? 0 : 3) + outs;
  }
}

// The ONE rule that prevents all spoilers
export function filterVisibleMessages(
  messages: Message[],
  userPos: number
): Message[] {
  return messages.filter(m => m.pos <= userPos);
}

// Share codes: unambiguous 6 chars
export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}
```

## 🔔 Notification Strategy

### Principles
1. **Never reveal content**: No message previews
2. **Never reveal position**: No "John is at the 9th inning"
3. **Only neutral hints**: "New reactions available"

### Implementation
```typescript
// Push notification payloads
{
  title: "WatchLock",
  body: "New reactions ready in Browns Family Room",
  badge: 1,
  data: { roomId, gameId }  // No content, no position
}

// In-app hints
"📦 New batch available after next inning"  // Obfuscated
"✨ 3 reactions waiting"  // Only if they're ALL visible
```

## 🚀 MVP Implementation Strategy

### Phase 1: Foundation (Critical Path)
- Next.js setup with TypeScript
- Supabase project with schema
- Auth flow (email/password)
- Basic room creation/joining

### Phase 2: Core Mechanics
- Monotonic position system
- Progress tracking UI
- Message creation with position
- **The Filter** - `message.pos <= user.pos`

### Phase 3: Family Features
- Room member list
- Presence (carefully obfuscated)
- Share code display/copy
- Room settings (name, max members)

### Phase 4: Polish & Safety
- Loading states
- Error boundaries
- No-spoiler notifications
- Mobile optimization

### Phase 5: Testing
- Unit: Position encoding/filtering
- Integration: API endpoints
- E2E: Complete spoiler prevention
- Load: 100+ messages performance

## 📊 Success Metrics

### Technical KPIs
- ✅ Zero spoilers leaked (100% accuracy)
- ✅ <100ms message delivery
- ✅ <2s initial load
- ✅ Works offline (reads cached)

### User KPIs
- ✅ Grandma can use it
- ✅ 2-click room creation
- ✅ 1-click share code copy
- ✅ Works on 5-year-old phones

## 💰 Monetization Path

### Free Tier (Launch)
- 2 active rooms
- 6 members per room
- 100 messages per game
- 7-day history

### Family Plan ($4.99/mo)
- Unlimited rooms
- 10 members per room
- Unlimited messages
- 90-day history
- Custom room themes
- Priority support

### Future Revenue Streams
- Team/league white-label
- Custom emoji packs
- Replay exports
- SMS integration

## 🎯 Go-to-Market Strategy

### Launch Strategy
1. **Seed Users**: You + your dad
2. **Story**: Share the personal story on Reddit r/Cubs
3. **Expand**: Target long-distance families
4. **Communities**: Parent Facebook groups, expat communities

### Growth Levers
- Share codes are viral by design
- "Powered by WatchLock" in free tier
- Family referral rewards
- Sports influencer partnerships

## 🚨 Risk Mitigation

### Technical Risks
- **Spoiler leaks**: Extensive testing, audit all paths
- **Scale issues**: Edge functions, efficient queries
- **Real-time failures**: Graceful fallback to polling

### Business Risks
- **ESPN builds this**: Stay focused on family niche
- **Low adoption**: Launch with compelling story
- **API costs**: Start with manual game creation

## 📋 Final Checklist

### Must Have (MVP)
- [x] Family rooms (2-6 members)
- [x] MLB support with pos system
- [x] Perfect spoiler prevention
- [x] Share codes
- [x] Mobile responsive
- [x] Real-time updates

### Nice to Have (Post-MVP)
- [ ] NBA/NFL support
- [ ] SMS integration
- [ ] Replay mode
- [ ] Custom themes
- [ ] Emoji reactions
- [ ] Export timeline

---

This plan prioritizes the **Family Mode** positioning with a rock-solid technical foundation using the monotonic position system. The focus is on trust, simplicity, and perfect spoiler prevention.