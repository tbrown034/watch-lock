# WatchLock Implementation Roadmap

## 🎯 Mission
Build a fully functional MVP that prevents spoilers for delayed sports viewers through intelligent message filtering based on game progress.

## 🚦 Implementation Phases

### Phase 1: Project Setup ✅
```bash
# Commands to run
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install zustand framer-motion
npm install -D @types/node
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card input label select slider toast
```

**Files to create:**
- `.env.local` (Supabase keys)
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `middleware.ts` (auth)

### Phase 2: Database Setup ✅
**Supabase Dashboard Tasks:**
1. Create new project
2. Run migrations from `PLANNING.md`
3. Enable Row Level Security
4. Configure auth settings
5. Get API keys

**Files to create:**
- `supabase/migrations/001_initial_schema.sql`
- `lib/supabase/types.ts` (generate from dashboard)
- `types/index.ts` (from TYPES.md)

### Phase 3: Authentication ✅
**Pages to build:**
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/(auth)/layout.tsx`

**Components:**
- `components/auth/LoginForm.tsx`
- `components/auth/SignupForm.tsx`
- `components/auth/AuthGuard.tsx`

**API Routes:**
- `app/api/auth/callback/route.ts`

### Phase 4: Core Game Logic ✅
**Utilities to implement:**
- `lib/utils/game-logic.ts`
  - `calculatePosition()`
  - `isMessageVisible()`
  - `filterMessages()`
  - `generateShareCode()`
- `lib/utils/formatters.ts`
  - `formatGamePosition()`
  - `formatTimeAgo()`

### Phase 5: Game Management ✅
**Pages:**
- `app/(app)/dashboard/page.tsx`
- `app/(app)/games/create/page.tsx`
- `app/(app)/games/join/page.tsx`
- `app/(app)/games/[id]/page.tsx`

**Components:**
- `components/game/GameCreator.tsx`
- `components/game/GameCard.tsx`
- `components/game/JoinGame.tsx`
- `components/game/GameHeader.tsx`

**API Routes:**
- `app/api/games/route.ts` (GET, POST)
- `app/api/games/[id]/route.ts` (GET, DELETE)
- `app/api/games/join/route.ts` (POST)

### Phase 6: Progress System ✅
**Components:**
- `components/game/ProgressSlider.tsx`
  - Inning selector (1-9+)
  - Half toggle (Top/Bottom)
  - Outs selector (0-3)
  - Visual position indicator
  - "LIVE" badge

**API Routes:**
- `app/api/games/[id]/progress/route.ts` (GET, PATCH)

**Store:**
- `lib/stores/game-store.ts`
  - Progress state
  - Update methods
  - Optimistic updates

### Phase 7: Messaging System ✅
**Components:**
- `components/game/MessageTimeline.tsx`
- `components/game/MessageCard.tsx`
- `components/game/MessageInput.tsx`
- `components/game/NewMessageIndicator.tsx`

**API Routes:**
- `app/api/games/[id]/messages/route.ts` (GET, POST)

**Features:**
- Auto-scroll to bottom
- Message grouping by inning
- Timestamp display
- User avatars

### Phase 8: Real-time Updates ✅
**Setup:**
- `lib/supabase/realtime.ts`
- `components/providers/RealtimeProvider.tsx`

**Subscriptions:**
- New messages
- Progress updates
- User joins
- Presence

**Hooks:**
- `lib/hooks/useRealtime.ts`
- `lib/hooks/useGame.ts`
- `lib/hooks/useMessages.ts`

### Phase 9: UI Polish ✅
**Improvements:**
- Loading skeletons
- Error boundaries
- Empty states
- Animations (Framer Motion)
- Mobile responsive design
- Dark mode (optional)

**Components:**
- `components/ui/Skeleton.tsx`
- `components/ui/ErrorBoundary.tsx`
- `components/ui/EmptyState.tsx`
- `components/ui/LoadingSpinner.tsx`

### Phase 10: Testing Suite ✅
**Setup:**
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D @types/jest
```

**Test Files:**
- Unit tests in `__tests__` folders
- Integration tests in `tests/integration/`
- E2E tests in `tests/e2e/`

**Run Tests:**
```bash
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Phase 11: Deployment ✅
**Steps:**
1. Push to GitHub
2. Connect Vercel to repo
3. Add environment variables
4. Deploy
5. Test production build
6. Monitor with Vercel Analytics

## 📁 Final File Structure
```
watch-lock/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── games/
│   │   │   ├── [id]/page.tsx
│   │   │   ├── create/page.tsx
│   │   │   └── join/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/callback/route.ts
│   │   └── games/
│   │       ├── route.ts
│   │       ├── [id]/
│   │       │   ├── route.ts
│   │       │   ├── messages/route.ts
│   │       │   └── progress/route.ts
│   │       └── join/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthGuard.tsx
│   ├── game/
│   │   ├── GameCard.tsx
│   │   ├── GameCreator.tsx
│   │   ├── GameHeader.tsx
│   │   ├── JoinGame.tsx
│   │   ├── MessageCard.tsx
│   │   ├── MessageInput.tsx
│   │   ├── MessageTimeline.tsx
│   │   ├── NewMessageIndicator.tsx
│   │   └── ProgressSlider.tsx
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   └── RealtimeProvider.tsx
│   ├── ui/
│   │   └── [shadcn components]
│   └── shared/
│       └── Navigation.tsx
├── lib/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGame.ts
│   │   ├── useMessages.ts
│   │   └── useRealtime.ts
│   ├── stores/
│   │   └── game-store.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── realtime.ts
│   │   ├── server.ts
│   │   └── types.ts
│   └── utils/
│       ├── formatters.ts
│       └── game-logic.ts
├── public/
│   └── [assets]
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── unit/
├── types/
│   └── index.ts
└── [config files]
```

## 🔄 Iterative Development Process

### For Each Component/Feature:
1. **Build** → Create the component/feature
2. **Test** → Write and run tests
3. **Refine** → Fix issues and optimize
4. **Integrate** → Connect to the system
5. **Verify** → Test in context

### Development Commands:
```bash
# Development
npm run dev

# Testing
npm run test:watch     # During development
npm run test          # Before commit

# Type checking
npm run type-check

# Linting
npm run lint

# Building
npm run build
npm run start         # Test production build
```

## ✅ Success Criteria

### Must Have (MVP):
- [x] User can create account and login
- [x] User can create a game with teams
- [x] Share code is generated and copyable
- [x] Other users can join with share code
- [x] Users can send messages
- [x] Messages are tagged with game position
- [x] Progress slider works smoothly
- [x] Messages filter based on progress
- [x] Real-time updates work
- [x] Mobile responsive
- [x] No spoilers ever shown
- [x] All critical tests pass

### Nice to Have (Post-MVP):
- [ ] Emoji reactions
- [ ] User avatars
- [ ] Game templates
- [ ] Notification preferences
- [ ] Message search
- [ ] Export chat history
- [ ] Voice notes
- [ ] Multiple sports support

## 🚀 Ready to Execute

This roadmap provides a complete blueprint for building WatchLock. Each phase builds on the previous one, ensuring a stable foundation at every step. The emphasis is on:

1. **Core functionality first** - No spoilers is the #1 priority
2. **Real user testing early** - Get it in front of users ASAP
3. **Iterative improvements** - Ship fast, improve continuously
4. **Comprehensive testing** - Ensure reliability

When you unleash me to build, I'll follow this roadmap systematically, creating a fully functional, tested, and polished MVP.