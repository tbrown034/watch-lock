# WatchLock MVP User Flow
**Last Updated**: 2025-10-12

---

## Core Decisions

### 1. Guest vs Authenticated
- **Guests**: localStorage only (solo demo mode, no collaboration)
- **Authenticated**: Database-backed rooms (multi-user, real-time sync)
- **No migration**: Demo data stays local, doesn't transfer to DB

### 2. Room Privacy
- **All rooms are PRIVATE** (share code required)
- No public rooms in MVP
- Focus: Trusted friend/family groups

### 3. Username Strategy
- **Auto-generated** from Google OAuth (full_name or email)
- Collision-safe (appends numbers: "johndoe2")
- Editable later in profile settings

### 4. Room Lifecycle
- **Auto-archives** when all games in room end
- One room can have multiple games (future)
- MVP: 1 room = 1 game for simplicity

---

## User Journey Map

### Guest User Flow (Not Signed In)

```
┌─────────────────────────────────────────────────┐
│ 1. Land on homepage                             │
│    - See value prop                             │
│    - "Sign in" button in top right              │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│ 2. Click "Explore Game Rooms" (unsigned)        │
│    → Navigate to /games                         │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│ 3. See list of MLB games                        │
│    Each game shows:                             │
│    - [Try Demo Mode] ← localStorage only        │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│ 4. Click "Try Demo Mode"                        │
│    → Navigate to /games/{id}?mode=demo          │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│ 5. Game Room (Demo Mode)                        │
│    ┌─────────────────────────────────────────┐  │
│    │ ⚠️ DEMO MODE                           │  │
│    │ You're testing solo. Messages are      │  │
│    │ saved locally and won't be shared.     │  │
│    │                                         │  │
│    │ [Sign In to Create Watch Party] ────┐  │  │
│    └─────────────────────────────────────┘  │  │
│                                              │  │
│    - Set position (slider)                  │  │
│    - Post messages (localStorage)           │  │
│    - See spoiler-locking in action          │  │
│    - All data local to browser              │  │
└─────────────────┬────────────────────────────┘  │
                  │                               │
                  v                               │
         [Refresh = data lost]              [Sign in] ──┐
                                                         │
                                                         v
                                          [Authenticated Flow Below]
```

---

### Authenticated User Flow (Signed In)

```
┌─────────────────────────────────────────────────┐
│ 1. Sign in with Google OAuth                    │
│    - Auto-create profile with username          │
│    - Pull avatar from Google picture field      │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│ 2. Navigate to /games                           │
│    Each MLB game now shows TWO options:         │
│    - [Try Demo Mode] (localStorage)             │
│    - [Create Watch Party] (database)            │
│    - [Join Watch Party] (enter share code)      │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
         v                v
   [Create Room]    [Join Room]
```

#### Path A: Create Watch Party

```
┌─────────────────────────────────────────────────┐
│ 3A. Click "Create Watch Party"                  │
│     Modal appears:                              │
│     ┌─────────────────────────────────────────┐ │
│     │ Create Watch Party                      │ │
│     │                                         │ │
│     │ Game: Yankees @ Red Sox                │ │
│     │                                         │ │
│     │ Room Name: [My Watch Party_____]       │ │
│     │ Max Members: [10___] people            │ │
│     │                                         │ │
│     │ [Create Room]                          │ │
│     └─────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│ 4A. Room created!                               │
│     Database writes:                            │
│     - rooms table (with share_code)             │
│     - room_members (creator as owner)           │
│     - games table (links MLB game to room)      │
│     - progress_markers (creator's position)     │
│                                                 │
│     Show success:                               │
│     ┌─────────────────────────────────────────┐ │
│     │ ✅ Room Created!                        │ │
│     │                                         │ │
│     │ Share this code with friends:          │ │
│     │                                         │ │
│     │        🔗 ABC123                        │ │
│     │        [Copy Link]                      │ │
│     │                                         │ │
│     │ [Enter Room]                           │ │
│     └─────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────┘
                 │
                 v
         [Game Room - Multi-user Mode]
```

#### Path B: Join Watch Party

```
┌─────────────────────────────────────────────────┐
│ 3B. Click "Join Watch Party"                    │
│     Modal appears:                              │
│     ┌─────────────────────────────────────────┐ │
│     │ Join Watch Party                        │ │
│     │                                         │ │
│     │ Enter 6-character code:                │ │
│     │ [______]                               │ │
│     │                                         │ │
│     │ [Join Room]                            │ │
│     └─────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│ 4B. Validate share code (API call)              │
│     - Check if code exists                      │
│     - Check if room is full                     │
│     - Check if user already in room             │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
       Valid          Invalid
         │               │
         v               v
   [Add to room]   [Show error]
         │
         v
┌─────────────────────────────────────────────────┐
│ 5B. Added to room!                              │
│     Database writes:                            │
│     - room_members (new member)                 │
│     - progress_markers (their position)         │
│                                                 │
│     Redirect to game room                       │
└────────────────┬────────────────────────────────┘
                 │
                 v
         [Game Room - Multi-user Mode]
```

---

### Game Room (Multi-user Mode)

```
┌─────────────────────────────────────────────────┐
│ Header                                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ Yankees @ Red Sox                           │ │
│ │                                             │ │
│ │ 👥 3 watching: @alice @bob @charlie        │ │
│ │                                             │ │
│ │ Share Code: ABC123 [Copy]                  │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────┐
│ Left Column          │ Right Column             │
│                      │                          │
│ Progress Controls    │ Messages Feed            │
│ ┌──────────────────┐ │ ┌──────────────────────┐ │
│ │ Your Position:   │ │ │ alice: 🔥 What a     │ │
│ │ Top 3rd, 1 out   │ │ │ catch!              │ │
│ │                  │ │ │ (Top 3rd, 1 out)    │ │
│ │ [Slider]         │ │ ├──────────────────────┤ │
│ └──────────────────┘ │ │ bob: LET'S GO!!!    │ │
│                      │ │ (Top 3rd, 2 outs)   │ │
│ Game State           │ └──────────────────────┘ │
│ ┌──────────────────┐ │                          │
│ │ Score: 2-1       │ │ [Message Input Box]      │
│ │ Bases: 1st, 3rd  │ │                          │
│ └──────────────────┘ │                          │
│                      │                          │
│ [Leave Message]      │                          │
└──────────────────────┴──────────────────────────┘
```

#### Real-time Behavior

**When Alice sets position to "Top 3rd, 1 out":**
1. Write to `progress_markers` table
2. Database triggers Supabase Realtime
3. Bob and Charlie see: "alice is at Top 3rd, 1 out"

**When Alice posts "Great catch!":**
1. Write to `messages` table with `pos=31` (Top 3rd, 1 out encoded)
2. RLS policy checks: Can each user see this message?
   - Bob (at Top 2nd) → NO (pos=20 < 31)
   - Charlie (at Top 4th) → YES (pos=40 > 31)
3. Only Charlie sees the message until Bob catches up

**When Bob advances to Top 3rd, 1 out:**
1. Update `progress_markers` (pos=31)
2. RLS policy re-evaluates
3. Alice's message now appears for Bob!

---

## Database Operations by Screen

### /games (Browse Games)
**Guest:**
- No DB calls
- localStorage check for demo data

**Authenticated:**
```sql
-- Check if user is already in a room for each game
SELECT r.id, r.share_code, COUNT(rm.user_id) as member_count
FROM rooms r
JOIN games g ON g.room_id = r.id
JOIN room_members rm ON rm.room_id = r.id
WHERE g.external_id = 'mlb-746532'
  AND rm.user_id = auth.uid()
  AND r.is_archived = FALSE;
```

### /games/{id} (Game Room)

**Mode: Demo (localStorage)**
- No DB calls
- All data in localStorage keys:
  - `watchlock_user_pos_{gameId}`
  - `watchlock_messages_{gameId}`

**Mode: Multi-user (Database)**

On page load:
```sql
-- 1. Verify user is in room
SELECT r.*, g.*
FROM rooms r
JOIN games g ON g.room_id = r.id
JOIN room_members rm ON rm.room_id = r.id
WHERE g.id = $gameId
  AND rm.user_id = auth.uid();

-- 2. Get all room members
SELECT p.username, p.avatar_url, pm.pos, pm.pos_meta
FROM room_members rm
JOIN profiles p ON p.id = rm.user_id
JOIN progress_markers pm ON pm.user_id = rm.user_id AND pm.game_id = $gameId
WHERE rm.room_id = $roomId;

-- 3. Get messages (RLS filters by position)
SELECT m.*, p.username, p.avatar_url
FROM messages m
JOIN profiles p ON p.id = m.author_id
WHERE m.game_id = $gameId
  AND m.is_deleted = FALSE
ORDER BY m.pos ASC, m.created_at ASC;
```

When user updates position:
```sql
INSERT INTO progress_markers (game_id, user_id, pos, pos_meta)
VALUES ($gameId, auth.uid(), $newPos, $newMeta)
ON CONFLICT (game_id, user_id)
DO UPDATE SET pos = $newPos, pos_meta = $newMeta, updated_at = NOW();
```

When user posts message:
```sql
INSERT INTO messages (game_id, author_id, body, pos, pos_meta)
VALUES ($gameId, auth.uid(), $body, $currentPos, $currentMeta);
```

---

## API Routes Needed

### `POST /api/rooms/create`
**Input:**
```json
{
  "gameId": "mlb-746532",
  "name": "My Watch Party",
  "maxMembers": 10
}
```

**Logic:**
1. Verify user is authenticated
2. Generate unique share code
3. Create room in database
4. Auto-add creator as owner (trigger)
5. Create game record linked to room
6. Initialize creator's progress marker

**Output:**
```json
{
  "roomId": "uuid",
  "shareCode": "ABC123",
  "gameId": "uuid"
}
```

---

### `POST /api/rooms/join`
**Input:**
```json
{
  "shareCode": "ABC123"
}
```

**Logic:**
1. Verify user is authenticated
2. Find room by share code
3. Check if room is full
4. Check if user already in room
5. Add user to room_members
6. Initialize user's progress marker

**Output:**
```json
{
  "roomId": "uuid",
  "gameId": "uuid",
  "memberCount": 3
}
```

---

### `GET /api/rooms/{roomId}/members`
**Output:**
```json
{
  "members": [
    {
      "userId": "uuid",
      "username": "alice",
      "avatarUrl": "https://...",
      "role": "owner",
      "position": {
        "pos": 31,
        "posMeta": {"inning": 3, "half": "TOP", "outs": 1}
      }
    }
  ]
}
```

---

### `POST /api/games/{gameId}/position`
**Input:**
```json
{
  "pos": 31,
  "posMeta": {"inning": 3, "half": "TOP", "outs": 1, "phase": "LIVE"}
}
```

**Logic:**
1. Verify user is in room for this game
2. Upsert progress_markers
3. Update room.last_activity_at

---

### `POST /api/games/{gameId}/messages`
**Input:**
```json
{
  "body": "Great catch!",
  "pos": 31,
  "posMeta": {"inning": 3, "half": "TOP", "outs": 1}
}
```

**Logic:**
1. Verify user is in room for this game
2. Insert message (RLS handles visibility)
3. Update room.last_activity_at

---

### `GET /api/games/{gameId}/messages`
**Query params:**
- `limit`: Number of messages (default 50)
- `before`: Cursor for pagination

**Output:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "authorId": "uuid",
      "username": "alice",
      "avatarUrl": "https://...",
      "body": "Great catch!",
      "pos": 31,
      "posMeta": {"inning": 3, "half": "TOP", "outs": 1},
      "createdAt": "2025-10-12T20:45:00Z"
    }
  ]
}
```

Note: RLS automatically filters messages user can't see yet

---

## Key Edge Cases

### 1. User refreshes page
- If in demo mode → localStorage persists
- If in multi-user mode → reload from database

### 2. User tries to join full room
- API returns error: "Room is full (10/10 members)"
- Show modal: "This room is full. Try creating your own!"

### 3. User enters invalid share code
- API returns error: "Room not found"
- Show inline error: "Invalid code. Check with your friend."

### 4. User already in room for this game
- If clicking "Create" → Show: "You're already in a room for this game"
- If clicking "Join" with different code → Allow (can be in multiple rooms)

### 5. Game ends
- Trigger sets `games.actual_end = NOW()`
- Auto-archive trigger runs
- Room becomes read-only (messages stay visible)
- Users can still view archived rooms in "My Rooms" page

### 6. Username collision
- Trigger handles: "johndoe" → "johndoe2" → "johndoe3"
- User can edit later in profile settings

---

## UI Component Breakdown

### Components to Build

1. **RoomCreateModal** (`/components/room/RoomCreateModal.tsx`)
   - Form: room name, max members
   - Calls POST /api/rooms/create
   - Shows share code on success

2. **RoomJoinModal** (`/components/room/RoomJoinModal.tsx`)
   - Input: 6-char code
   - Calls POST /api/rooms/join
   - Redirects on success

3. **ShareCodeDisplay** (`/components/room/ShareCodeDisplay.tsx`)
   - Shows room's share code
   - Copy to clipboard button
   - Share link generator

4. **RoomMemberList** (`/components/room/RoomMemberList.tsx`)
   - Shows avatars + usernames
   - Shows each person's current position
   - Real-time updates via Supabase subscription

5. **DemoModeBanner** (`/components/game/DemoModeBanner.tsx`)
   - Yellow banner at top of game room
   - "You're in demo mode. Sign in to collaborate."

6. **GameRoomLayout** (`/components/game/GameRoomLayout.tsx`)
   - Detects mode (demo vs multi-user)
   - Switches between localStorage and DB data sources
   - Handles real-time subscriptions for multi-user

---

## Next Steps

1. ✅ Database schema finalized
2. ⬜ Run migration in Supabase SQL Editor
3. ⬜ Build API routes (rooms/create, rooms/join)
4. ⬜ Build room modals (create, join)
5. ⬜ Update GameRoomPage to support both modes
6. ⬜ Add Supabase Realtime subscriptions
7. ⬜ Test multi-user flow end-to-end
8. ⬜ Deploy to production

---

## Success Metrics

**Demo Mode:**
- Can guest users test the mechanic without signing in? ✅
- Does localStorage persist across page refreshes? ✅
- Is the value prop clear? ✅

**Multi-user Mode:**
- Can users create rooms and get share codes? ⬜
- Can friends join via share code? ⬜
- Do messages sync in real-time? ⬜
- Does spoiler-locking work correctly? ⬜
- Do positions update live for all members? ⬜

**Conversion:**
- Do demo users understand the upgrade path? ⬜
- Is sign-in friction low enough? ⬜
- Do users successfully invite friends? ⬜
