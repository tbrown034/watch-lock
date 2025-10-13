# 🔒 WatchLock

**Share the highs without the spoilers.**

Post your reactions now; your people see them only when they catch up.

## 🎯 The Problem

You're watching the Cubs game live. Your dad is watching it on delay. You want to text him about that amazing home run, but you can't without spoiling it. Current messaging apps don't understand game time vs. real time.

## 💡 The Solution: Family Mode

WatchLock is a trust-first, family-oriented messaging system for sports fans. Built for 2-6 private members who want to share the emotional journey of watching games together, apart.

**Core Innovation**: Every message is anchored to a game position (converted to a monotonic integer). Users only see messages where `message.pos <= user.pos`. Simple rule, perfect spoiler prevention.

## 🏆 Competitive Analysis

### SWOT Analysis

| Strengths | Weaknesses |
|-----------|------------|
| ✅ Clear niche (family mode) | ⚠️ Needs 2+ users for value |
| ✅ Emotional value & stickiness | ⚠️ Sports API costs if integrated |
| ✅ Monotonic position system as moat | ⚠️ Multi-sport complexity |
| ✅ Viral share codes | ⚠️ Monetization challenges |

| Opportunities | Threats |
|--------------|---------|
| 📈 Expand sports coverage | ⚠️ ESPN/leagues could build this |
| 🧵 Streaming "watch parties" | ⚠️ Notification spoiler risks |
| 🏷️ White-label for teams | ⚠️ Low initial adoption |
| 💰 Family plan subscriptions | ⚠️ Platform lock-in risks |

### Why We Win
1. **No direct competitors** - ESPN has chat but no spoiler protection. Discord has spoiler tags but they're manual.
2. **Family-first positioning** - Not trying to be everything for everyone
3. **Technical moat** - The monotonic position system is elegant and hard to replicate
4. **Personal story** - "Built so I could share Cubs games with my dad"

## 🚀 MVP Feature Set

### Launch Features
- 🏠 **Family Rooms** - 2-6 private members, no public spaces
- ⚾ **MLB Support** - Full inning/half/outs granularity (including end-of-half, pregame, and postgame states)
- 🎯 **Perfect Filtering** - `message.pos <= user.pos` rule
- 🔄 **Live Sync** - Optional one-tap sync that pulls the latest inning/outs from the free MLB Stats API
- 📱 **Mobile First** - Built for couch viewing
- 🔗 **Share Codes** - 6-character viral invites
- ⚡ **Real-time** - Sub-100ms message delivery

### Post-MVP Roadmap
- 🏀 NBA support (quarter/clock)
- 🏈 NFL support (quarter/clock)
- 📱 SMS integration (Twilio)
- 🎬 "Replay with me" mode
- 🎨 Custom themes & reactions
- 💼 White-label for leagues

## 🛠️ Technical Architecture

### Core Innovation: Monotonic Position System
```typescript
// Convert any MLB position to a single integer
// 8 steps per inning (Top: 0,1,2,END • Bottom: 0,1,2,END)
// Pregame/Postgame map to sentinel values before/after the grid
function encodeMlbPosition(meta: MlbMeta): number {
  if (meta.phase === 'PREGAME') return MLB_PREGAME_POSITION;
  if (meta.phase === 'POSTGAME') return MLB_POSTGAME_POSITION;

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

### Tech Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Deployment**: Vercel Edge Functions
- **Testing**: Jest + Playwright

### Data Sources
- **MLB Stats API** (`lib/services/mlbSchedule.ts`): free, no-key endpoint used through `/api/games/schedule` to hydrate today's live MLB matchups with a mock fallback.

### Database Design
```sql
-- Simplified schema with monotonic position
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
```

## 💰 Business Model

### Free Tier
- 2 active rooms
- 6 members per room
- 100 messages per game

### Family Plan ($4.99/mo)
- Unlimited rooms
- 10 members per room
- Unlimited messages
- Custom themes
- Priority support

### Growth Strategy
1. **Seed**: Launch with you + your dad story
2. **Community**: Share on r/Cubs, parent groups
3. **Viral**: Share codes spread naturally
4. **Retention**: Family bonds = high stickiness

## 📋 Development Status

### Completed
- ✅ Planning & architecture documents
- ✅ Core position encoding system
- ✅ Database schema with RLS
- ✅ Next.js + TypeScript setup
- ✅ Supabase integration
- ✅ Authentication flow
- ✅ Room creation & joining
- ✅ Message system with filtering
- ✅ Progress tracking
- ✅ Real-time updates
- ✅ Mobile responsive UI

### In Progress
- 🔄 UI polish & refinements
- 🔄 Comprehensive testing suite
- 🔄 Performance optimization

### Upcoming
- 📋 Production deployment
- 📋 Launch strategy execution
- 📋 User feedback iteration

For detailed implementation guide, see [DEVELOPMENT.md](./DEVELOPMENT.md)

## 🎯 Success Metrics

### Technical
- ✅ Zero spoilers (100% accuracy)
- ✅ <100ms message latency
- ✅ <2s page load
- ✅ Works on 5-year-old phones

### User
- ✅ 2-click room creation
- ✅ Grandma-friendly UX
- ✅ 80% D1 retention
- ✅ 50% refer a family member

## 🔧 Development Setup

```bash
# Clone and install
git clone https://github.com/yourusername/watch-lock.git
cd watch-lock
npm install

# Environment setup
cp .env.example .env.local
# Add Supabase keys

# Development
npm run dev

# Testing
npm run test
npm run test:e2e

# Production build
npm run build
npm run start
```

## 📚 Documentation

- [Development Guide](./DEVELOPMENT.md) - Technical architecture and implementation details
- [Planning Document](./PLANNING.md) - Complete system design and strategy
- [Testing Guide](./TESTING.md) - Comprehensive test specifications

## 🚨 Key Principles

1. **No Spoilers Ever** - The filtering must be bulletproof
2. **Family First** - Optimize for 2-6 close relationships
3. **Trust & Privacy** - No public rooms, no leaks
4. **Mobile Native** - Most sports viewing is on the couch
5. **Simple UX** - If grandma can't use it, we failed

## 📈 Why This Works

**Personal Story**: Built because I wanted to share Cubs games with my dad without spoiling them.

**Real Problem**: Every sports fan has experienced the "delayed viewer dilemma."

**Simple Solution**: One rule (`message.pos <= user.pos`) solves everything.

**Natural Virality**: Share codes + family bonds = organic growth.

---

**Built with love so families can share the game, not the spoilers.** ⚾

*For questions or contributions, open an issue or PR.*
