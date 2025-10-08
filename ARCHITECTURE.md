# 🏛️ WatchLock Architecture Documentation

## System Overview

WatchLock is a spoiler-free messaging system for sports fans watching games at different times. The architecture prioritizes security, simplicity, and family-friendly UX.

---

## 🧩 Component Architecture

### Component Tree

```
App (Root Layout)
├── Landing Page (/)
│   └── Hero Section
│       ├── Title & Tagline
│       └── CTA Buttons (Get Started, Learn More)
│
├── Authentication Pages (/auth/*)
│   ├── Login Page (/auth/login)
│   │   └── LoginForm
│   │       ├── Email Input
│   │       ├── Password Input
│   │       └── Submit Button
│   │
│   └── Signup Page (/auth/signup)
│       └── SignupForm
│           ├── Email Input
│           ├── Username Input
│           ├── Password Input
│           ├── Confirm Password
│           └── Submit Button
│
└── Game Room (/games/[id])
    ├── GameHeader
    │   ├── Game Title (e.g., "Cubs @ Cardinals")
    │   ├── Room Name (e.g., "Brown Family")
    │   ├── Share Code Display
    │   └── Member Count
    │
    ├── ProgressSlider ⭐ (Core Component)
    │   ├── InningSelector
    │   │   └── Buttons [1][2][3]...[9]
    │   ├── HalfToggle
    │   │   └── [Top ▲] [Bottom ▼]
    │   ├── OutsSelector
    │   │   └── [0] [1] [2]
    │   ├── ProgressBar
    │   │   └── Visual % indicator
    │   └── LiveBadge
    │       └── "LIVE" indicator
    │
    ├── MessageFeed
    │   ├── HiddenMessageAlert
    │   │   └── "📦 X messages waiting ahead"
    │   ├── MessageList
    │   │   └── MessageCard[]
    │   │       ├── Avatar
    │   │       ├── Username
    │   │       ├── Position Badge
    │   │       ├── Message Bubble
    │   │       └── Timestamp
    │   └── EmptyState
    │       └── "No messages yet"
    │
    └── MessageComposer
        ├── PositionIndicator
        │   └── "Posting at: T5 • 1 out"
        ├── TextInput
        │   └── Message textarea
        ├── CharacterCount
        │   └── "X/280"
        └── SendButton
            └── "Send" / "Sending..."
```

---

## 🔄 Business Logic Flow

### 1. Message Creation Flow

```mermaid
User Types Message
    ↓
MessageComposer captures text
    ↓
User clicks Send
    ↓
Get current position from ProgressSlider
    ↓
POST /api/games/[id]/messages
    ↓
Server computes position integer
    ↓
Server validates position metadata
    ↓
Insert into database with pos
    ↓
Return success
    ↓
Polling picks up new message
    ↓
MessageFeed re-renders
```

**Code Implementation:**
```typescript
// MessageComposer.tsx
const handleSubmit = async (e: FormEvent) => {
  // 1. Get message text
  const text = message.trim();

  // 2. Current position from props
  const position = currentPosition;  // e.g., {inning: 5, half: 'TOP', outs: 1}

  // 3. Send to API
  await onSend(text);  // Parent handles position attachment
};

// Parent Component
const sendMessage = async (body: string) => {
  // 4. Include position metadata
  await fetch('/api/games/[id]/messages', {
    method: 'POST',
    body: JSON.stringify({
      body,
      posMeta: currentPosition  // Server will compute pos
    })
  });
};

// API Route
export async function POST(req: Request) {
  const { body, posMeta } = await req.json();

  // 5. SERVER COMPUTES POSITION (Critical!)
  const pos = encodeMlbPosition(posMeta);

  // 6. Insert with server-computed position
  await db.insert(messages).values({
    body,
    pos,      // Integer for filtering
    posMeta,  // Metadata for display
  });
}
```

### 2. Message Filtering Flow

```mermaid
User loads game room
    ↓
Fetch user's current progress
    ↓
GET /api/games/[id]/messages
    ↓
Server gets user's position
    ↓
SQL: WHERE message.pos <= user.pos
    ↓
Return filtered messages
    ↓
MessageFeed renders only visible
    ↓
Poll every 2 seconds for updates
```

**Code Implementation:**
```typescript
// useMessages.ts (Client Hook)
const fetchMessages = async () => {
  // 1. Request messages (no position sent - server knows)
  const response = await fetch(`/api/games/${gameId}/messages`);
  const data = await response.json();

  // 2. Messages are pre-filtered by server
  setMessages(data.messages);
  setHiddenCount(data.hiddenCount);
};

// API Route (Server)
export async function GET(req: Request) {
  // 3. Get user's position from database
  const userProgress = await db.query.progressMarkers.findFirst({
    where: and(
      eq(progressMarkers.gameId, gameId),
      eq(progressMarkers.userId, userId)
    )
  });

  const userPos = userProgress?.pos ?? 0;

  // 4. Filter in SQL (not JavaScript!)
  const messages = await db.execute(sql`
    SELECT * FROM messages
    WHERE game_id = ${gameId}
      AND pos <= ${userPos}  -- THE CRITICAL FILTER
    ORDER BY pos, created_at
  `);

  return NextResponse.json({ messages });
}
```

### 3. Progress Update Flow

```mermaid
User moves ProgressSlider
    ↓
Calculate new position locally
    ↓
Update UI optimistically
    ↓
PATCH /api/games/[id]/progress
    ↓
Server validates monotonic rule
    ↓
Only update if pos > current
    ↓
Return actual position
    ↓
UI syncs with server decision
    ↓
Triggers message re-fetch
```

**Code Implementation:**
```typescript
// ProgressSlider.tsx
const handleInningChange = (inning: number) => {
  // 1. Update local state immediately (optimistic)
  const newPosition = { ...localPosition, inning };
  setLocalPosition(newPosition);

  // 2. Notify parent
  onChange(newPosition);
};

// Parent Component
const updateProgress = async (position: MlbMeta) => {
  // 3. Send to server
  const response = await fetch('/api/games/[id]/progress', {
    method: 'PATCH',
    body: JSON.stringify({ posMeta: position })
  });

  // 4. Server may reject if going backward
  const data = await response.json();

  // 5. Sync with server's decision
  if (!data.updated) {
    // Server rejected - revert UI
    setPosition(data.posMeta);
  }
};

// API Route
export async function PATCH(req: Request) {
  const { posMeta } = await req.json();
  const newPos = encodeMlbPosition(posMeta);

  // 6. MONOTONIC UPDATE ONLY
  await db.execute(sql`
    UPDATE progress_markers
    SET pos = ${newPos}, pos_meta = ${posMeta}
    WHERE game_id = ${gameId}
      AND user_id = ${userId}
      AND pos < ${newPos}  -- Only if moving forward!
  `);
}
```

---

## 🎯 UI/UX Strategy

### Component Responsibilities

#### ProgressSlider - The Control Center
**Purpose**: Give users precise control over their viewing position

**Design Decisions**:
- **Buttons over dropdowns**: Faster on mobile, clearer state
- **Three separate controls**: Inning, Half, Outs - each independent
- **Visual progress bar**: Quick position reference
- **Persistent state**: Position saved to database

**Interaction Flow**:
```
User taps "5" → Jumps to 5th inning
User taps "Bottom" → Switches to bottom half
User taps "2" → Sets to 2 outs
Each change → Immediate UI update → Server sync → Message refresh
```

#### MessageFeed - The Smart Display
**Purpose**: Show only safe messages, hint at what's ahead

**Design Decisions**:
- **Server-filtered only**: Never trust client filtering
- **Hidden count teaser**: Creates anticipation without spoilers
- **Auto-scroll**: New messages always visible
- **Position badges**: Context for when message was sent

**Visual Hierarchy**:
```
[Hidden Messages Alert] ← Yellow, top of feed
    |
[Message Cards] ← Main content area
    |
    ├── [Own Messages] ← Right-aligned, blue
    └── [Others' Messages] ← Left-aligned, gray
```

#### MessageComposer - The Input Gateway
**Purpose**: Capture reactions at specific game moments

**Design Decisions**:
- **Position transparency**: Always show where message will anchor
- **Character limit**: Twitter-like constraint for conciseness
- **Loading states**: Clear feedback during send
- **Bottom position**: Thumb-friendly on mobile

**State Machine**:
```
Idle → Typing → Sending → Success → Idle
 ↓                ↓
 ↓              Error → Show Error → Idle
 ↓
Character Limit → Prevent Send
```

### Mobile-First Responsive Design

#### Breakpoints
```css
/* Mobile (default) */
.component { /* Base styles */ }

/* Tablet */
@media (min-width: 768px) {
  .component { /* Enhanced spacing */ }
}

/* Desktop */
@media (min-width: 1024px) {
  .component { /* Multi-column layouts */ }
}
```

#### Touch Optimization
- **44x44px minimum touch targets** (Apple HIG standard)
- **8px minimum spacing** between interactive elements
- **Bottom-sheet patterns** for primary actions
- **Swipe gestures** considered for future

### Color Psychology

```typescript
const colors = {
  // Trust & Reliability
  primary: 'blue-600',      // Own messages, CTAs

  // Neutrality
  gray: {
    light: 'gray-200',      // Other's messages
    dark: 'gray-700',       // Borders, secondary text
  },

  // Anticipation & Warning
  warning: 'yellow-500',    // Hidden messages alert

  // Success & Live
  success: 'green-500',     // LIVE badge

  // Danger (sparingly used)
  danger: 'red-500',        // Errors only
};
```

---

## 🔐 Security Architecture

### Defense in Depth

#### Layer 1: Client Validation
```typescript
// Prevent obvious errors, improve UX
if (position.outs > 2) {
  throw new Error('Invalid outs value');
}
```

#### Layer 2: API Validation
```typescript
// Never trust client data
if (!isValidMlbPosition(posMeta)) {
  return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
}
```

#### Layer 3: Server Computation
```typescript
// Always compute critical values server-side
const pos = encodeMlbPosition(posMeta);  // Never use client's pos
```

#### Layer 4: Database Constraints
```sql
-- Enforce at database level
ALTER TABLE messages ADD CONSTRAINT valid_pos CHECK (pos >= 0);
ALTER TABLE progress_markers ADD CONSTRAINT monotonic CHECK (pos >= 0);
```

#### Layer 5: SQL Filtering
```sql
-- Final defense: filter in query
WHERE m.pos <= (
  SELECT pos FROM progress_markers
  WHERE user_id = ? AND game_id = ?
)
```

### Threat Model

| Threat | Mitigation |
|--------|------------|
| User sends fake position | Server recomputes position |
| User tries to go backward | Monotonic constraint prevents |
| User modifies API request | Server validates all inputs |
| User tries to see future messages | SQL WHERE clause prevents |
| User spoofs another user | Auth middleware checks |
| Database corruption | Constraints prevent invalid data |

---

## 📊 Performance Optimizations

### Database Indexes
```sql
-- Optimize message queries
CREATE INDEX idx_messages_game_pos
  ON messages(game_id, pos, created_at);

-- Optimize progress lookups
CREATE INDEX idx_progress_game_user
  ON progress_markers(game_id, user_id);
```

### Query Optimization
```sql
-- Bad: Fetch all, filter in JavaScript
SELECT * FROM messages WHERE game_id = ?;
// Then: messages.filter(m => m.pos <= userPos)

-- Good: Filter in database
SELECT * FROM messages
WHERE game_id = ? AND pos <= ?
LIMIT 100;  -- Pagination for scale
```

### React Optimizations
```typescript
// Memoize expensive calculations
const visibleMessages = useMemo(
  () => filterMessages(messages, userPos),
  [messages, userPos]
);

// Prevent unnecessary re-renders
const MessageCard = React.memo(({ message, isOwn }) => {
  // Only re-render if props change
});
```

### Network Optimizations
```typescript
// Debounce position updates
const debouncedUpdate = useMemo(
  () => debounce(updateProgress, 500),
  []
);

// Batch API calls where possible
const fetchGameData = async () => {
  const [messages, progress, members] = await Promise.all([
    fetch('/api/messages'),
    fetch('/api/progress'),
    fetch('/api/members'),
  ]);
};
```

---

## 🔮 Future Architecture Considerations

### Scaling to WebSockets
```typescript
// Current: Polling
useInterval(() => fetchMessages(), 2000);

// Future: WebSocket
const ws = new WebSocket('wss://api/games/[id]/subscribe');
ws.on('message', (event) => {
  if (event.pos <= userPos) {
    addMessage(event.data);
  }
});
```

### Adding More Sports
```typescript
interface SportEncoder {
  encode(meta: SportMeta): number;
  decode(pos: number): SportMeta;
  format(meta: SportMeta): string;
}

const encoders: Record<Sport, SportEncoder> = {
  mlb: new MlbEncoder(),
  nba: new NbaEncoder(),  // Future
  nfl: new NflEncoder(),  // Future
};
```

### Microservices Architecture (Long-term)
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Web App   │────▶│  API Gateway │────▶│   Auth      │
└─────────────┘     └──────────────┘     │   Service   │
                            │             └─────────────┘
                            ▼
                    ┌──────────────┐     ┌─────────────┐
                    │   Message    │────▶│  Position   │
                    │   Service    │     │   Service   │
                    └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Database   │
                    │   Cluster    │
                    └──────────────┘
```

---

## 📝 Architecture Principles

1. **Server Authority**: Never trust the client for critical logic
2. **Fail Secure**: Default to hiding messages when uncertain
3. **Progressive Enhancement**: Core features work without JavaScript
4. **Mobile First**: Design for phones, enhance for desktop
5. **Family Friendly**: Every decision considers non-technical users
6. **Monotonic Progress**: Complexity eliminated through one-way flow
7. **SQL Filtering**: Database does heavy lifting, not application
8. **Clear Boundaries**: Each component has single responsibility

---

*This architecture document describes the complete technical design of WatchLock, emphasizing security, simplicity, and family-first UX decisions.*