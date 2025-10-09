# WatchLock Type Definitions

## Core Position System Types

```typescript
// The heart of WatchLock - monotonic position system
export interface Position {
  pos: number; // Monotonic integer (0, 1, 2, ...)
  posMeta: PositionMeta; // Sport-specific metadata
}

export type PositionMeta = MlbMeta | NbaMeta | NflMeta;

export interface MlbMeta {
  sport: "mlb";
  inning: number; // 1-9+ (extra innings allowed, no max)
  half: "TOP" | "BOTTOM";
  outs: 0 | 1 | 2; // Only 0-2, never 3
}

export interface NbaMeta {
  sport: "nba";
  quarter: 1 | 2 | 3 | 4 | 5; // 5 = OT
  minutes: number; // 0-12 (counting down)
  seconds: number; // 0-59
}

export interface NflMeta {
  sport: "nfl";
  quarter: 1 | 2 | 3 | 4 | 5; // 5 = OT
  minutes: number; // 0-15 (counting down)
  seconds: number; // 0-59
}
```

## Database Types

```typescript
// Room (family group) types
export interface Room {
  id: string;
  name: string;
  shareCode: string;
  maxMembers: number;
  isPrivate: boolean;
  createdBy: string;
  createdAt: Date;
}

// Game types
export interface Game {
  id: string;
  roomId: string;
  sport: "mlb" | "nba" | "nfl";
  title: string;
  homeTeam: string;
  awayTeam: string;
  startTime: Date | null;
  endTime: Date | null;
  isActive: boolean;
  createdAt: Date;
}

// Progress tracking
export interface ProgressMarker {
  gameId: string;
  userId: string;
  pos: number;
  posMeta: PositionMeta;
  updatedAt: Date;
  joinedAt: Date;
}

// Message types
export interface Message {
  id: string;
  gameId: string;
  authorId: string;
  body: string;
  kind: MessageKind;
  pos: number;
  posMeta: PositionMeta;
  createdAt: Date;
}

export type MessageKind = "text" | "emoji" | "reaction";

// User with profile
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  createdAt: Date;
}

// Room membership
export interface RoomMember {
  roomId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: Date;
  user?: User; // Joined data
}
```

## API Types

```typescript
// Room Management
export interface CreateRoomRequest {
  name: string;
  maxMembers?: number; // Default: 6
}

export interface CreateRoomResponse {
  room: Room;
  shareCode: string;
}

export interface JoinRoomRequest {
  shareCode: string;
}

export interface JoinRoomResponse {
  room: Room;
  members: RoomMember[];
  activeGame?: Game;
}

// Game Management
export interface StartGameRequest {
  sport: "mlb" | "nba" | "nfl";
  title: string;
  homeTeam: string;
  awayTeam: string;
  startTime?: Date;
}

export interface StartGameResponse {
  game: Game;
}

// Progress Updates
export interface UpdateProgressRequest {
  pos: number;
  posMeta: PositionMeta;
}

export interface GetProgressResponse {
  myProgress: ProgressMarker;
  otherProgress: ObfuscatedProgress[];
}

export interface ObfuscatedProgress {
  userId: string;
  username: string;
  hint: "behind" | "near" | "ahead" | "live";
}

// Messages
export interface SendMessageRequest {
  body: string;
  kind?: MessageKind;
}

export interface GetMessagesResponse {
  messages: MessageWithAuthor[];
  hasMore: boolean;
  hiddenCount: number; // Messages ahead of user's position
}

export interface MessageWithAuthor extends Message {
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}
```

## Real-time Event Types

```typescript
export type RealtimeEvent =
  | MessageCreatedEvent
  | ProgressUpdatedEvent
  | MemberJoinedEvent
  | GameStartedEvent
  | GameEndedEvent;

export interface MessageCreatedEvent {
  type: "MESSAGE_CREATED";
  payload: {
    message: MessageWithAuthor;
    gameId: string;
  };
}

export interface ProgressUpdatedEvent {
  type: "PROGRESS_UPDATED";
  payload: {
    userId: string;
    username: string;
    pos: number;
    hint: "behind" | "near" | "ahead" | "live";
  };
}

export interface MemberJoinedEvent {
  type: "MEMBER_JOINED";
  payload: {
    member: RoomMember;
    roomId: string;
  };
}

export interface GameStartedEvent {
  type: "GAME_STARTED";
  payload: {
    game: Game;
  };
}

export interface GameEndedEvent {
  type: "GAME_ENDED";
  payload: {
    gameId: string;
    finalPos: number;
  };
}
```

## Client State Types

```typescript
// Room state
export interface RoomState {
  currentRoom: Room | null;
  members: RoomMember[];
  activeGame: Game | null;
  isLoading: boolean;
  error: string | null;
}

// Game state
export interface GameState {
  game: Game | null;
  messages: MessageWithAuthor[];
  visibleMessages: MessageWithAuthor[];
  myProgress: ProgressMarker | null;
  otherProgress: ObfuscatedProgress[];
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth state
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Notification state
export interface NotificationState {
  hiddenMessageCount: number;
  lastCheckedPos: number;
  hasNewBatch: boolean;
}
```

## Utility Types

```typescript
// Position encoding/decoding
export interface PositionEncoder {
  encode(meta: PositionMeta): number;
  decode(pos: number, sport: string): PositionMeta;
  format(meta: PositionMeta): string;
}

// Share code generator
export interface ShareCodeGenerator {
  generate(): string;
  validate(code: string): boolean;
}

// Message filter
export interface MessageFilter {
  filter(messages: Message[], userPos: number): Message[];
  getHiddenCount(messages: Message[], userPos: number): number;
}

// Progress obfuscator
export interface ProgressObfuscator {
  obfuscate(
    userPos: number,
    otherPos: number
  ): "behind" | "near" | "ahead" | "live";
  generateHint(hiddenCount: number, nextMilestone: number): string;
}
```

## Form Types

```typescript
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export interface RoomFormData {
  name: string;
  maxMembers: number;
}

export interface GameFormData {
  sport: "mlb" | "nba" | "nfl";
  title: string;
  homeTeam: string;
  awayTeam: string;
}

export interface JoinFormData {
  shareCode: string;
}
```

## Component Props Types

```typescript
// Layout props
export interface LayoutProps {
  children: React.ReactNode;
}

// Page props
export interface PageProps {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Core component props
export interface RoomCardProps {
  room: Room;
  memberCount: number;
  activeGame?: Game;
  onEnter: () => void;
}

export interface GameHeaderProps {
  game: Game;
  room: Room;
  memberCount: number;
  onShareCode: () => void;
}

export interface ProgressControlProps {
  sport: "mlb" | "nba" | "nfl";
  position: Position;
  onChange: (position: Position) => void;
  isLive?: boolean;
  maxPosition?: number;
}

export interface MessageFeedProps {
  messages: MessageWithAuthor[];
  currentUserId: string;
  userPosition: number;
  onLoadMore?: () => void;
  hasMore?: boolean;
  hiddenCount?: number;
}

export interface MessageCardProps {
  message: MessageWithAuthor;
  isOwn: boolean;
  showPosition?: boolean;
}

export interface MessageComposerProps {
  onSend: (body: string, kind?: MessageKind) => void;
  disabled?: boolean;
  placeholder?: string;
  currentPosition: Position;
}

// Modal props
export interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (room: Room) => void;
}

export interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (room: Room) => void;
}

export interface StartGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (game: Game) => void;
  roomId: string;
}
```

## Hook Return Types

```typescript
export interface UseRoomReturn {
  room: Room | null;
  members: RoomMember[];
  activeGame: Game | null;
  isLoading: boolean;
  error: string | null;
  createRoom: (data: RoomFormData) => Promise<Room>;
  joinRoom: (shareCode: string) => Promise<Room>;
  leaveRoom: () => Promise<void>;
}

export interface UseGameReturn {
  game: Game | null;
  messages: MessageWithAuthor[];
  visibleMessages: MessageWithAuthor[];
  myProgress: ProgressMarker | null;
  otherProgress: ObfuscatedProgress[];
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  sendMessage: (body: string, kind?: MessageKind) => Promise<void>;
  updateProgress: (position: Position) => Promise<void>;
  startGame: (data: GameFormData) => Promise<Game>;
  endGame: () => Promise<void>;
}

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupFormData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (username: string, avatarUrl?: string) => Promise<void>;
}

export interface UseRealtimeReturn {
  isConnected: boolean;
  subscribe: (
    channel: string,
    callback: (event: RealtimeEvent) => void
  ) => void;
  unsubscribe: (channel: string) => void;
  presence: Map<string, any>;
}
```

## Error Types

```typescript
export class WatchLockError extends Error {
  constructor(message: string, public code: ErrorCode, public details?: any) {
    super(message);
    this.name = "WatchLockError";
  }
}

export enum ErrorCode {
  // Auth errors
  AUTH_REQUIRED = "AUTH_REQUIRED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_EXISTS = "USER_EXISTS",

  // Room errors
  ROOM_NOT_FOUND = "ROOM_NOT_FOUND",
  ROOM_FULL = "ROOM_FULL",
  ALREADY_MEMBER = "ALREADY_MEMBER",
  INVALID_SHARE_CODE = "INVALID_SHARE_CODE",

  // Game errors
  GAME_NOT_FOUND = "GAME_NOT_FOUND",
  GAME_ALREADY_ACTIVE = "GAME_ALREADY_ACTIVE",
  NOT_IN_GAME = "NOT_IN_GAME",

  // Message errors
  MESSAGE_TOO_LONG = "MESSAGE_TOO_LONG",
  RATE_LIMIT = "RATE_LIMIT",

  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  REALTIME_ERROR = "REALTIME_ERROR",
}
```

## Constants

```typescript
export const LIMITS = {
  MAX_ROOM_MEMBERS: 6,
  MAX_MESSAGE_LENGTH: 280,
  MAX_ROOMS_FREE: 2,
  MAX_MESSAGES_FREE: 100,
  SHARE_CODE_LENGTH: 6,
} as const;

export const SPORTS = {
  MLB: {
    maxInnings: 9,
    positionsPerInning: 6,
    overtimeInnings: 18,
  },
  NBA: {
    quartersRegular: 4,
    minutesPerQuarter: 12,
    overtimePeriods: 4,
  },
  NFL: {
    quartersRegular: 4,
    minutesPerQuarter: 15,
    overtimePeriod: 1,
  },
} as const;
```
