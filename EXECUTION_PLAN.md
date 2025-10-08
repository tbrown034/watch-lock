# 🚀 WatchLock MVP Execution Plan

## Mission
Build a fully functional, tested MVP that lets families share sports reactions without spoilers using a monotonic position filtering system.

## Core Principle
**One Rule**: `message.pos <= user.pos` - This single line of code prevents all spoilers.

## 🎯 What I Will Build

### The Complete MVP
1. **Full-stack Next.js application** with TypeScript
2. **Supabase backend** with auth, database, and real-time
3. **Family rooms** for 2-6 private members
4. **MLB support** with inning/half/outs tracking
5. **Perfect spoiler prevention** via monotonic position system
6. **Comprehensive test suite** ensuring zero spoilers
7. **Production deployment** on Vercel

## 📋 Execution Strategy

### Phase 1: Project Foundation (2 hours)
```bash
# What I'll do:
- Initialize Next.js 15 with TypeScript, Tailwind, App Router
- Install all dependencies (Supabase, Zustand, shadcn/ui, testing libs)
- Set up project structure matching our planning docs
- Create Supabase project and configure environment
- Run database migrations for our schema
- Set up basic auth with email/password
```

**Deliverables**: Working Next.js app with Supabase connected

### Phase 2: Core Logic Implementation (3 hours)
```typescript
// What I'll build:
- lib/position.ts         // Monotonic position encoder/decoder
- lib/game-logic.ts       // Message filtering (THE RULE)
- lib/share-codes.ts      // 6-char code generation
- api/rooms/*             // Room CRUD endpoints
- api/games/*             // Game management
- api/messages/*          // Message handling with filtering
- api/progress/*          // Progress tracking
```

**Deliverables**: All business logic working with tests

### Phase 3: UI Components (3 hours)
```tsx
// Components I'll create:
- RoomCard               // Display family rooms
- CreateRoomModal        // New room creation
- JoinRoomModal          // Join with share code
- GameHeader             // Show game info & share code
- ProgressSlider         // THE key component - position control
- MessageFeed            // Filtered message display
- MessageComposer        // Send reactions
- MobileNav              // Responsive navigation
```

**Deliverables**: Complete UI with mobile responsiveness

### Phase 4: Real-time Integration (2 hours)
```typescript
// Real-time features:
- Message broadcasts      // New messages appear instantly
- Progress updates        // See when family members advance
- Presence (obfuscated)   // "Dad is watching" (no position hints)
- Optimistic updates      // Instant UI feedback
- Reconnection handling   // Graceful network issues
```

**Deliverables**: Live updates working smoothly

### Phase 5: Testing Suite (2 hours)
```typescript
// Tests I'll write:
describe('Spoiler Prevention', () => {
  test('NEVER shows future messages')
  test('Shows messages at current position')
  test('Maintains visibility when going backward')
  test('Handles all edge cases')
})

describe('E2E User Flow', () => {
  test('Create room → Share code → Join → Message → Filter')
  test('Two users at different positions')
  test('Real-time updates respect position')
})
```

**Deliverables**: 100% test coverage on critical paths

### Phase 6: Polish & Deploy (1 hour)
```bash
# Final touches:
- Loading states and skeletons
- Error boundaries and handling
- Performance optimization
- SEO and meta tags
- Deploy to Vercel
- Test production build
- Create demo video
```

**Deliverables**: Production app live on Vercel

## 🛠️ My Working Process

### Iterative Development
1. **Build** component/feature
2. **Test** immediately
3. **Verify** spoiler prevention
4. **Commit** with clear message
5. **Move** to next feature

### Continuous Testing
```bash
# I'll run tests continuously:
npm run test:watch      # Unit tests while coding
npm run test:e2e        # E2E after each feature
npm run test:spoilers   # Custom spoiler prevention suite
```

### Quality Assurance
- Every message filtered through `pos` comparison
- No message content in notifications
- No position hints in presence
- Mobile-first responsive design
- Grandma-friendly UX

## 📁 File Structure I'll Create

```
watch-lock/
├── app/
│   ├── (public)/
│   │   ├── page.tsx              # Landing page
│   │   └── auth/
│   │       ├── login/page.tsx
│   │       └── signup/page.tsx
│   ├── (family)/
│   │   ├── layout.tsx            # Auth required
│   │   ├── rooms/
│   │   │   ├── page.tsx          # Room list
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Game room
│   │   └── join/page.tsx         # Join with code
│   └── api/
│       ├── rooms/
│       ├── games/
│       ├── messages/
│       └── progress/
├── components/
│   ├── family/                   # Family room components
│   ├── game/                     # Game components
│   ├── ui/                       # shadcn components
│   └── providers/                # Context providers
├── lib/
│   ├── position.ts               # Position encoder
│   ├── game-logic.ts             # Filtering logic
│   ├── supabase/                 # Database client
│   └── hooks/                    # React hooks
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── types/
    └── index.ts                  # TypeScript types
```

## 🎯 Success Criteria

### Must Work Perfectly
- [ ] Zero spoilers ever shown
- [ ] Messages filter correctly by position
- [ ] Real-time updates respect position
- [ ] Share codes work reliably
- [ ] Mobile responsive on all devices

### Performance Targets
- [ ] <100ms message delivery
- [ ] <2s initial page load
- [ ] Smooth slider interaction
- [ ] No janky animations

### User Experience
- [ ] 2-click room creation
- [ ] Copy share code with one tap
- [ ] Clear position indicator
- [ ] Obvious when new messages available

## 🚦 Go/No-Go Checkpoints

### After Each Phase
1. **Does filtering work?** Test with edge cases
2. **Is it mobile-friendly?** Test on phone
3. **Is it grandma-friendly?** Simple enough?
4. **Are tests passing?** 100% on critical paths
5. **Any spoiler risks?** Audit all code paths

## 💡 Key Decisions Made

1. **Monotonic integers over complex logic** - Simple is reliable
2. **Family rooms over public spaces** - Trust and privacy first
3. **Manual game creation initially** - Avoid API costs
4. **Supabase over custom backend** - Speed to market
5. **Mobile-first design** - Where sports are watched

## 🏁 Final Output

When complete, you'll have:
1. **Working app** at watchlock.vercel.app
2. **Complete test suite** with CI/CD
3. **Documentation** for all components
4. **Demo video** showing the experience
5. **Launch-ready** for Reddit/social sharing

## 🔥 Ready to Execute

This plan delivers exactly what you need:
- A spoiler-proof messaging system
- Family-focused experience
- Tested and reliable
- Ready for you and your dad to use

**Just say "go" and I'll build this entire MVP, test it thoroughly, and deploy it live.**

---

*"Share the highs without the spoilers" - Let's make it real.*