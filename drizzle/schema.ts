import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// SignSetu Translation Tables
export const translations = mysqlTable('translations', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  inputText: text('inputText').notNull(),
  glossSequence: text('glossSequence').notNull(), // JSON array of glosses
  language: mysqlEnum('language', ['ASL', 'ISL']).default('ASL').notNull(),
  sourceType: mysqlEnum('sourceType', ['text', 'audio', 'youtube']).default('text').notNull(),
  avatarAnimationUrl: varchar('avatarAnimationUrl', { length: 512 }),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type Translation = typeof translations.$inferSelect;
export type InsertTranslation = typeof translations.$inferInsert;

export const signDictionary = mysqlTable('signDictionary', {
  id: int('id').autoincrement().primaryKey(),
  gloss: varchar('gloss', { length: 128 }).notNull().unique(),
  language: mysqlEnum('language', ['ASL', 'ISL']).notNull(),
  poseUrl: varchar('poseUrl', { length: 512 }).notNull(), // URL to .pose file
  videoUrl: varchar('videoUrl', { length: 512 }), // Optional video preview
  duration: int('duration'), // Duration in milliseconds
  category: varchar('category', { length: 64 }), // e.g., 'greeting', 'action', 'noun'
  priority: int('priority').default(0), // Higher priority = more common
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type SignDictionary = typeof signDictionary.$inferSelect;
export type InsertSignDictionary = typeof signDictionary.$inferInsert;

export const fingerspellingAlphabet = mysqlTable('fingerspellingAlphabet', {
  id: int('id').autoincrement().primaryKey(),
  letter: varchar('letter', { length: 1 }).notNull().unique(),
  language: mysqlEnum('language', ['ASL', 'ISL']).notNull(),
  poseUrl: varchar('poseUrl', { length: 512 }).notNull(),
  duration: int('duration'), // Duration in milliseconds
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type FingerspellingAlphabet = typeof fingerspellingAlphabet.$inferSelect;
export type InsertFingerspellingAlphabet = typeof fingerspellingAlphabet.$inferInsert;

export const sessionHistory = mysqlTable('sessionHistory', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  translationId: int('translationId').notNull(),
  inputText: text('inputText').notNull(),
  glossSequence: text('glossSequence').notNull(), // JSON array
  language: mysqlEnum('language', ['ASL', 'ISL']).notNull(),
  sourceType: mysqlEnum('sourceType', ['text', 'audio', 'youtube']).default('text').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type SessionHistory = typeof sessionHistory.$inferSelect;
export type InsertSessionHistory = typeof sessionHistory.$inferInsert;

export const userPreferences = mysqlTable('userPreferences', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull().unique(),
  preferredLanguage: mysqlEnum('preferredLanguage', ['ASL', 'ISL']).default('ASL').notNull(),
  avatarChoice: varchar('avatarChoice', { length: 64 }).default('default'),
  playbackSpeed: int('playbackSpeed').default(100), // Percentage (100 = 1x speed)
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;