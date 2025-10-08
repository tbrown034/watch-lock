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
- ⚾ **MLB Support** - Full inning/half/outs granularity
- 🎯 **Perfect Filtering** - `message.pos <= user.pos` rule
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
// Convert any game position to a single integer
// MLB: 6 positions per inning (Top 0-2 outs, Bottom 0-2 outs)
function encodeMlbPosition(inning: number, half: 'TOP' | 'BOTTOM', outs: number): number {
  return (inning - 1) * 6 + (half === 'TOP' ? 0 : 3) + outs;
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

## 📋 Implementation Plan

### Phase 1: Foundation (Day 1)
- [x] Planning documents
- [ ] Next.js + TypeScript setup
- [ ] Supabase project & schema
- [ ] Basic auth flow

### Phase 2: Core Mechanics (Day 2)
- [ ] Monotonic position encoder
- [ ] Room creation/joining
- [ ] Message filtering logic
- [ ] Progress tracking

### Phase 3: Real-time & UI (Day 3)
- [ ] Progress slider component
- [ ] Message feed with filtering
- [ ] Real-time subscriptions
- [ ] Mobile responsive design

### Phase 4: Testing & Polish (Day 4)
- [ ] Unit tests for position logic
- [ ] E2E spoiler prevention tests
- [ ] Performance optimization
- [ ] Error handling

### Phase 5: Deploy (Day 5)
- [ ] Vercel deployment
- [ ] Production testing
- [ ] Launch on Reddit
- [ ] Monitor & iterate

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

- [Planning Document](./PLANNING.md) - Complete system design
- [Type Definitions](./TYPES.md) - TypeScript interfaces
- [Testing Guide](./TESTING.md) - Test specifications
- [Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md) - Build checklist

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

## 🎬 Current Status

### ✅ Planning Complete
All architecture, data models, and test specifications documented.

### ⏳ Ready to Build
The implementation plan is detailed and ready to execute. Once initiated, the build will proceed systematically through each phase, with continuous testing to ensure quality.

### 🚀 Launch Strategy
1. Build MVP (5 days)
2. Test with family (you + dad)
3. Share story on Reddit
4. Iterate based on feedback
5. Scale to more sports

---

**Built with love so families can share the game, not the spoilers.** ⚾

*For questions or contributions, open an issue or PR.*# watch-lock
