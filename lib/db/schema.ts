import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  primaryKey,
  json,
  varchar
} from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Rooms (family groups)
export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  shareCode: varchar('share_code', { length: 6 }).notNull().unique(),
  maxMembers: integer('max_members').default(6).notNull(),
  isPrivate: boolean('is_private').default(true).notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Room memberships
export const roomMembers = pgTable('room_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['owner', 'member'] }).notNull().default('member'),
  joinedAt: timestamp('joined_at').defaultNow().notNull()
});

// Games
export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }).notNull(),
  sport: text('sport', { enum: ['mlb', 'nba', 'nfl'] }).notNull().default('mlb'),
  title: text('title').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Progress markers - THE CRITICAL TABLE
export const progressMarkers = pgTable('progress_markers', {
  gameId: uuid('game_id').references(() => games.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  pos: integer('pos').notNull().default(0), // THE CRITICAL FIELD - monotonic position
  posMeta: json('pos_meta').notNull().default({}), // Sport-specific metadata
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.gameId, table.userId] })
}));

// Messages - with monotonic position
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').references(() => games.id, { onDelete: 'cascade' }).notNull(),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  body: text('body').notNull(),
  kind: text('kind', { enum: ['text', 'emoji', 'reaction'] }).notNull().default('text'),
  pos: integer('pos').notNull(), // Position when message was sent
  posMeta: json('pos_meta').notNull(), // Sport-specific position details
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;

export type RoomMember = typeof roomMembers.$inferSelect;
export type NewRoomMember = typeof roomMembers.$inferInsert;

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type ProgressMarker = typeof progressMarkers.$inferSelect;
export type NewProgressMarker = typeof progressMarkers.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;