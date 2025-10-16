# WatchLock Type Reference

Core TypeScript types for the position system, database schema, and API contracts.

## Position System Types

```typescript
export interface Position {
  pos: number;                    // Monotonic integer
  posMeta: MlbMeta | NflMeta;     // Sport-specific metadata
}

export interface MlbMeta {
  sport: 'mlb';
  inning: number;                 // 1-9+ (extra innings allowed)
  half: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2 | 'END';        // 0-2 during play, END at half conclusion
  phase?: 'PREGAME' | 'IN_PROGRESS' | 'POSTGAME';
}

export interface NflMeta {
  sport: 'nfl';
  quarter: 1 | 2 | 3 | 4 | 5;     // 5 = OT
  time: string;                   // "MM:SS" format (e.g., "10:32")
  possession?: 'home' | 'away' | null;
  phase?: 'PREGAME' | 'Q1' | 'Q2' | 'HALFTIME' | 'Q3' | 'Q4' | 'OVERTIME' | 'POSTGAME';
}
```

## Database Types

```typescript
// Profiles (extends auth.users)
export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

// Rooms
export interface Room {
  id: string;
  name: string;
  share_code: string;             // 6 chars, uppercase
  max_members: number;
  created_by: string;
  created_at: Date;
  last_activity_at: Date;
  is_archived: boolean;
  archived_at: Date | null;
}

// Room Membership
export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: Date;
  last_viewed_at: Date;
  is_favorite: boolean;
}

// Games
export interface Game {
  id: string;
  room_id: string;
  sport: 'mlb' | 'nba' | 'nfl';
  title: string;
  home_team: string;
  away_team: string;
  external_id: string | null;     // e.g., "mlb-746532"
  scheduled_start: Date | null;
  actual_start: Date | null;
  actual_end: Date | null;
  is_active: boolean;
  is_live: boolean;
  created_at: Date;
  created_by: string;
}

// Progress Markers
export interface ProgressMarker {
  game_id: string;
  user_id: string;
  pos: number;
  pos_meta: MlbMeta | NflMeta;    // JSONB
  updated_at: Date;
  joined_at: Date;
}

// Messages
export interface Message {
  id: string;
  game_id: string;
  author_id: string;
  body: string;
  kind: 'text' | 'emoji' | 'reaction';
  pos: number;
  pos_meta: MlbMeta | NflMeta;    // JSONB
  is_deleted: boolean;
  deleted_at: Date | null;
  created_at: Date;
}
```

## API Types

### Room Management

```typescript
// POST /api/rooms/create
export interface CreateRoomRequest {
  gameId: string;          // External ID (e.g., "mlb-746532")
  name: string;
  maxMembers?: number;     // Default: 10
  homeTeam: string;
  awayTeam: string;
}

export interface CreateRoomResponse {
  roomId: string;
  shareCode: string;
  gameId: string;          // External ID
  success: boolean;
}

// POST /api/rooms/join
export interface JoinRoomRequest {
  shareCode: string;
}

export interface JoinRoomResponse {
  roomId: string;
  gameId: string;          // External ID
  memberCount: number;
  success: boolean;
}

// GET /api/rooms/[roomId]/members
export interface RoomMembersResponse {
  members: Array<{
    userId: string;
    username: string;
    avatarUrl: string | null;
    role: 'owner' | 'admin' | 'member';
    position: {
      pos: number;
      posMeta: MlbMeta | NflMeta;
      updatedAt: Date;
    } | null;
    messageCount: number;
    joinedAt: Date;
  }>;
  success: boolean;
}
```

### Progress & Messages

```typescript
// POST /api/games/[id]/position
export interface UpdateProgressRequest {
  pos: number;
  posMeta: MlbMeta | NflMeta;
}

// POST /api/games/[id]/messages
export interface SendMessageRequest {
  body: string;
  pos: number;
  posMeta: MlbMeta | NflMeta;
}

// GET /api/games/[id]/messages
export interface GetMessagesResponse {
  messages: Array<{
    id: string;
    authorId: string;
    username: string;
    avatarUrl: string | null;
    body: string;
    pos: number;
    posMeta: MlbMeta | NflMeta;
    createdAt: Date;
  }>;
  success: boolean;
}
```

### Game Data

```typescript
// GET /api/games/schedule
export interface ScheduleGame {
  id: string;              // External ID
  gamePk: number;          // MLB API game ID
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
  inning?: string;
  score?: {
    home: number;
    away: number;
  };
}

// GET /api/games/[id]/state
export interface GameState {
  gameId: string;
  status: string;
  inning: string;
  inningState: string;
  outs: number;
  balls: number;
  strikes: number;
  score: {
    home: number;
    away: number;
  };
}

// GET /api/games/[id]/room
export interface RoomInfoResponse {
  room: {
    id: string;
    name: string;
    shareCode: string;
    maxMembers: number;
    memberCount: number;
    createdBy: string;
    isOwner: boolean;
    createdAt: Date;
  };
}
```

## Constants

```typescript
export const POSITION_CONSTANTS = {
  MLB_PREGAME: -1,
  MLB_POSTGAME: 1_000_000,
  NFL_PREGAME: -1,
  NFL_POSTGAME: 2_000_000,
  MLB_POSITIONS_PER_INNING: 8,
  NFL_SECONDS_PER_QUARTER: 900,
} as const;

export const LIMITS = {
  MAX_ROOM_MEMBERS: 10,
  MAX_MESSAGE_LENGTH: 280,
  SHARE_CODE_LENGTH: 6,
} as const;
```
