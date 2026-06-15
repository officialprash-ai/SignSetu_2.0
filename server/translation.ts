import { invokeLLM } from "./_core/llm";
import { KNOWN_SIGNS } from "./vocab";
import {
  checkDeterministicMapping,
  localOfflineTranslate,
} from "./offlineTranslate";

export interface GlossSequence {
  gloss: string;
  startMs: number;
  endMs: number;
  confidence: number;
  fingerspell?: boolean; // true → single-letter ASL handshape
}

/** ms per full sign (comfortable signing pace) */
const SIGN_MS     = 500;
/** ms per fingerspelled letter */
const LETTER_MS   = 200;
/** short pause inserted between fingerspelled words */
const FS_PAUSE_MS = 100;

// ─── Circuit breaker ──────────────────────────────────────────────────────────
// On a 429 / RESOURCE_EXHAUSTED from the LLM we trip a 5-minute cooldown and
// route everything through the local offline translator until it expires. This
// stops us hammering a rate-limited endpoint and keeps signing uninterrupted.
const COOLDOWN_MS = 5 * 60 * 1000;
let breakerOpenUntil = 0;

function breakerOpen(): boolean {
  return Date.now() < breakerOpenUntil;
}
function tripBreaker(): void {
  breakerOpenUntil = Date.now() + COOLDOWN_MS;
  console.warn(`[translation] circuit breaker tripped — offline for ${COOLDOWN_MS / 1000}s`);
}
function isRateLimit(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  return /\b429\b|RESOURCE_EXHAUSTED|rate.?limit|quota|too many requests/i.test(m);
}

/** Exposed for diagnostics / tests. */
export function getBreakerState(): { open: boolean; until: number } {
  return { open: breakerOpen(), until: breakerOpenUntil };
}

export async function textToGloss(
  text: string,
  language: 'ASL' | 'ISL'
): Promise<GlossSequence[]> {
  // 1) Deterministic instant match for very common phrases — no network.
  const deterministic = checkDeterministicMapping(text, language);
  if (deterministic) return expandGlosses(deterministic);

  // 2) LLM path (skipped while the circuit breaker is open).
  if (!breakerOpen()) {
    try {
      return await llmTextToGloss(text, language);
    } catch (error) {
      if (isRateLimit(error)) tripBreaker();
      console.warn(
        '[translation] LLM failed — falling back to offline translator:',
        error instanceof Error ? error.message : error,
      );
      // fall through to offline
    }
  }

  // 3) Offline fallback — guaranteed to return, never throws.
  return expandGlosses(localOfflineTranslate(text, language));
}

async function llmTextToGloss(
  text: string,
  language: 'ASL' | 'ISL'
): Promise<GlossSequence[]> {
  const grammarInstruction = language === 'ASL'
    ? 'Convert to ASL glosses using SVO (Subject-Verb-Object) word order. Remove articles and prepositions. Use UPPERCASE for glosses.'
    : 'Convert to ISL glosses using SOV (Subject-Object-Verb) word order. Remove copula and articles. Use UPPERCASE for glosses.';

  const systemPrompt = `You are a sign language translation expert. ${grammarInstruction}

Return a JSON array of glosses with this structure:
[{"gloss": "WORD", "confidence": 0.95, "fingerspell": false}, ...]

Rules:
- Set "fingerspell": true ONLY for proper nouns (people names, city/country names), abbreviations (USA, NASA), and domain-specific jargon with no established sign.
- Common English words (verbs, nouns, adjectives, pronouns) always have established signs — set "fingerspell": false for them.
- For fingerspelled items, "gloss" should be the FULL word in UPPERCASE (e.g., "JOHN", "NASA") — the system will expand it letter by letter.
- Only return valid JSON, no other text.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Translate: "${text}"` },
      ],
    });

    const message = response.choices[0]?.message;
    if (!message) throw new Error('Empty response from LLM');

    const content = typeof message.content === 'string' ? message.content : '';
    if (!content) throw new Error('No text content in LLM response');

    let rawGlosses: Array<{ gloss: string; confidence?: number; fingerspell?: boolean }>;
    try {
      // Strip markdown code fences if present (e.g. ```json ... ```)
      const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      rawGlosses = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${content}`);
    }

    if (!Array.isArray(rawGlosses)) throw new Error('LLM response is not an array');

    const corrected = rawGlosses.map(item => {
      const g = (item.gloss || '').toUpperCase();
      if (item.fingerspell && KNOWN_SIGNS.has(g)) {
        return { ...item, fingerspell: false };
      }
      return item;
    });

    return expandGlosses(corrected);
  } catch (error) {
    console.error('Error in textToGloss:', error);
    throw new Error(
      `Failed to convert text to gloss: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function expandGlosses(
  rawGlosses: Array<{ gloss: string; confidence?: number; fingerspell?: boolean }>
): GlossSequence[] {
  const sequences: GlossSequence[] = [];
  let currentMs = 0;

  for (const item of rawGlosses) {
    const gloss      = (item.gloss || 'UNKNOWN').toUpperCase();
    const confidence = item.confidence ?? 0.8;

    if (item.fingerspell && gloss.length > 1) {
      for (const letter of gloss) {
        if (!/^[A-Z0-9]$/.test(letter)) continue;
        sequences.push({
          gloss:       letter,
          startMs:     currentMs,
          endMs:       currentMs + LETTER_MS,
          confidence,
          fingerspell: true,
        });
        currentMs += LETTER_MS;
      }
      currentMs += FS_PAUSE_MS;
    } else if (item.fingerspell && gloss.length === 1) {
      sequences.push({ gloss, startMs: currentMs, endMs: currentMs + LETTER_MS, confidence, fingerspell: true });
      currentMs += LETTER_MS;
    } else {
      sequences.push({ gloss, startMs: currentMs, endMs: currentMs + SIGN_MS, confidence });
      currentMs += SIGN_MS;
    }
  }

  return sequences;
}

export function extractGlosses(sequence: GlossSequence[]): string[] {
  return sequence.map(item => item.gloss.toUpperCase());
}

export function isFingerspellingCandidate(gloss: string): boolean {
  const n = gloss.toUpperCase();
  return n.length === 1 && /^[A-Z0-9]$/.test(n);
}

export function wordToFingerspelling(word: string): string[] {
  return word.toUpperCase().split('').filter(c => /^[A-Z0-9]$/.test(c));
}