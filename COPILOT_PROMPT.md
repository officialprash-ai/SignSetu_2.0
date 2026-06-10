# SignSetu — GitHub Copilot Backend Context Prompt

## Project Overview

**SignSetu** is an AI-powered sign language translation web app.
- Text / voice / YouTube → ASL or ISL gloss sequence → 3D avatar animation
- Target users: deaf/HoH community, sign language learners, educators

---

## Tech Stack (EXACT — do not substitute)

| Layer | Tech |
|-------|------|
| Runtime | Node.js, Express |
| API | tRPC v11 (type-safe, no REST) |
| ORM | Drizzle ORM + MySQL2 |
| DB | MySQL (DATABASE_URL env) |
| LLM | Internal `invokeLLM()` wrapper (OpenAI-compatible) |
| STT | Internal `transcribeAudio()` wrapper (Whisper-compatible) |
| Storage | Internal `storagePut()` → S3 via presigned URL |
| Auth | Manus OAuth — user available as `ctx.user` (type: `User | null`) |
| Build | Vite + TypeScript |

**No Next.js. No REST endpoints. All features = tRPC procedures.**

---

## Repository Structure (relevant server files)

```
server/
  _core/
    trpc.ts          ← publicProcedure, protectedProcedure, adminProcedure, router
    context.ts       ← TrpcContext: { user: User|null, req, res }
    llm.ts           ← invokeLLM({ messages }) → OpenAI-style response
    voiceTranscription.ts ← transcribeAudio({ audioUrl, language? }) → WhisperResponse | TranscriptionError
    env.ts           ← ENV.forgeApiUrl, ENV.forgeApiKey, ENV.ownerOpenId
  db.ts              ← All Drizzle query functions (see below)
  storage.ts         ← storagePut(relKey, data, contentType) → { key, url }
  translation.ts     ← textToGloss(), expandGlosses(), KNOWN_SIGNS set
  routers.ts         ← Root router: system, translation, voice, history, preferences, auth
  routers/
    translation.ts   ← translation.textToSign, translation.getPreferences
    voice.ts         ← voice.transcribe (base64 audio → Whisper → text)
    history.ts       ← history.list (user translation history)
    preferences.ts   ← preferences.get, preferences.set

drizzle/
  schema.ts          ← All table definitions (see schemas below)
```

---

## Database Schema (Drizzle / MySQL)

```typescript
// users
{ id, openId, name, email, loginMethod, role: "user"|"admin", createdAt, updatedAt, lastSignedIn }

// translations
{ id, userId, inputText, glossSequence (JSON string), language: "ASL"|"ISL",
  sourceType: "text"|"audio"|"youtube", avatarAnimationUrl, createdAt, updatedAt }

// signDictionary
{ id, gloss (UPPERCASE), language, poseUrl, videoUrl, duration (ms),
  category, priority, createdAt, updatedAt }

// fingerspellingAlphabet
{ id, letter (1 char), language, poseUrl, duration (ms), createdAt }

// sessionHistory
{ id, userId, translationId, inputText, glossSequence (JSON), language,
  sourceType, createdAt }

// userPreferences
{ id, userId (unique), preferredLanguage: "ASL"|"ISL", avatarChoice,
  playbackSpeed (int, 100 = 1x), createdAt, updatedAt }
```

---

## Key Domain Types

```typescript
// server/translation.ts
interface GlossSequence {
  gloss: string;        // UPPERCASE sign gloss, OR single letter if fingerspell
  startMs: number;
  endMs: number;
  confidence: number;
  fingerspell?: boolean; // true = single ASL letter handshape
}

// Timing constants
SIGN_MS = 500      // ms per full sign
LETTER_MS = 200    // ms per fingerspelled letter
FS_PAUSE_MS = 100  // pause between fingerspelled words
```

---

## Existing DB Query Functions (server/db.ts)

All functions lazy-init DB connection. Return gracefully if DB unavailable.

```typescript
getDb() → Drizzle instance | null
upsertUser(user: InsertUser) → void
getUserByOpenId(openId) → User | undefined
saveTranslation(userId, inputText, glossSequence, language, sourceType) → result
getSignByGloss(gloss, language) → SignDictionary | null
searchDictionary(query, language, limit?) → SignDictionary[]
getUserTranslationHistory(userId, limit?) → Translation[]
getOrCreateUserPreferences(userId) → UserPreferences
updateUserPreferences(userId, updates) → void
getFingerspellingLetter(letter, language) → FingerspellingAlphabet | null
getTranslationById(translationId) → Translation | null
```

---

## tRPC Procedure Pattern

```typescript
// server/routers/example.ts
import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { someDbFn } from '../db';

export const exampleRouter = router({
  // Public query (no auth required)
  getData: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const userId = (ctx as any)?.user?.id as number | undefined;
      // ... return data
    }),

  // Protected mutation (throws UNAUTHORIZED if not logged in)
  doSomething: protectedProcedure   // ctx.user is guaranteed non-null here
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;  // safe — protectedProcedure guarantees user
      // ...
    }),
});

// Register in server/routers.ts:
// import { exampleRouter } from './routers/example';
// example: exampleRouter,  ← add to appRouter object
```

---

## What Is Already Built (DO NOT rebuild)

### ✅ Frontend (complete — handled separately)
- `SignAvatar.tsx` — React Three Fiber 3D humanoid avatar, 26-letter fingerspelling, 10 sign poses, per-finger bone animation
- `Translator.tsx` — text input, voice record, language select, playback controls, gloss chip timeline
- `AudioRecorder.tsx` — MediaRecorder → base64 → `voice.transcribe`
- `Dictionary.tsx` — sign search/browse page
- `History.tsx` — translation history with real DB query + guest fallback

### ✅ Backend (complete)
- `translation.textToSign` — LLM gloss, KNOWN_SIGNS override, fingerspell expansion
- `voice.transcribe` — base64 audio → S3 → Whisper → text
- `history.list` — user translation history from DB
- `preferences.get` / `preferences.set` — language + speed, DB-backed

---

## What Needs Building (Phase 2 Backend)

### 1. `youtube` router — YouTube URL → transcript → gloss

**Procedure:** `youtube.transcribe`
- Input: `{ url: string, language: 'ASL' | 'ISL' }`
- Steps:
  1. Validate YouTube URL
  2. Use `yt-dlp` (shell exec) or YouTube Data API to extract audio/captions
  3. If captions available → use directly as transcript
  4. If no captions → download audio → `storagePut` → `transcribeAudio`
  5. Call `textToGloss(transcript, language)` → return gloss sequence
  6. Save to `translations` table with `sourceType: 'youtube'`
- Return: `{ transcript: string, glossSequence: GlossSequence[] }`

---

### 2. `dictionary` router — real sign dictionary CRUD

**Procedures:**
- `dictionary.search` — fuzzy search `signDictionary` by gloss + language + category
- `dictionary.getByGloss` — exact lookup, returns pose/video URL
- `dictionary.seed` (adminProcedure) — bulk insert signs from JSON payload
- `dictionary.suggest` — for a given input word, return top-3 closest gloss matches (simple Levenshtein or DB LIKE)

---

### 3. `auth` improvements — user profile endpoint

**Procedures:**
- `auth.profile` (protectedProcedure) — return full user row + preferences joined
- `auth.updateProfile` — update name, preferred language

---

### 4. `stats` router — admin dashboard data

**Procedures (adminProcedure):**
- `stats.overview` — total users, total translations, translations today, top glosses
- `stats.topGlosses` — most-translated glosses last 30d, grouped by language

---

## Environment Variables Available

```
DATABASE_URL              — MySQL connection string
BUILT_IN_FORGE_API_URL    — LLM + Whisper + Storage base URL (ENV.forgeApiUrl)
BUILT_IN_FORGE_API_KEY    — API key (ENV.forgeApiKey)
```

---

## Coding Rules

1. Every new router = new file `server/routers/<name>.ts`, exported as `<name>Router`
2. Register in `server/routers.ts` under `appRouter`
3. Use `publicProcedure` unless login required → use `protectedProcedure`
4. Admin-only → `adminProcedure`
5. DB calls via functions in `server/db.ts` — add new query functions there, not inline
6. All errors via `TRPCError` with appropriate code (`BAD_REQUEST`, `INTERNAL_SERVER_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`)
7. Never throw raw errors — always wrap in TRPCError
8. Fire-and-forget DB writes (history/stats) with `.catch(console.warn)` — never block response
9. Graceful DB degradation — if `getDb()` returns null, return empty/default, don't throw
10. TypeScript strict — no `any` except `(ctx as any)?.user?.id` pattern for optional auth
