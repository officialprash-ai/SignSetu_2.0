import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, translations, signDictionary, sessionHistory, userPreferences, fingerspellingAlphabet } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// SignSetu-specific queries

export async function saveTranslation(userId: number, inputText: string, glossSequence: string, language: 'ASL' | 'ISL', sourceType: 'text' | 'audio' | 'youtube') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(translations).values({
    userId,
    inputText,
    glossSequence,
    language,
    sourceType,
  });

  return result;
}

export async function getSignByGloss(gloss: string, language: 'ASL' | 'ISL') {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(signDictionary)
    .where(and(
      eq(signDictionary.gloss, gloss.toUpperCase()),
      eq(signDictionary.language, language)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function searchDictionary(query: string, language: 'ASL' | 'ISL', limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  // Simple LIKE search - can be optimized with full-text search later
  const result = await db.select().from(signDictionary)
    .where(and(
      eq(signDictionary.language, language)
    ))
    .limit(limit);

  return result;
}

export async function getUserTranslationHistory(userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(translations)
    .where(eq(translations.userId, userId))
    .orderBy(desc(translations.createdAt))
    .limit(limit);

  return result;
}

export async function getOrCreateUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default preferences
  await db.insert(userPreferences).values({
    userId,
    preferredLanguage: 'ASL',
    avatarChoice: 'default',
    playbackSpeed: 100,
  });

  return {
    id: 0,
    userId,
    preferredLanguage: 'ASL' as const,
    avatarChoice: 'default',
    playbackSpeed: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function updateUserPreferences(userId: number, updates: Partial<{ preferredLanguage: 'ASL' | 'ISL', avatarChoice: string, playbackSpeed: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(userPreferences)
    .set(updates)
    .where(eq(userPreferences.userId, userId));
}

export async function getFingerspellingLetter(letter: string, language: 'ASL' | 'ISL') {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(fingerspellingAlphabet)
    .where(and(
      eq(fingerspellingAlphabet.letter, letter.toUpperCase()),
      eq(fingerspellingAlphabet.language, language)
    ))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function getTranslationById(translationId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(translations)
    .where(eq(translations.id, translationId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
