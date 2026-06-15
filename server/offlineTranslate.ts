// ─── Deterministic + offline gloss translation (safety layer) ─────────────────
// Two guarantees for the signing pipeline:
//   1. checkDeterministicMapping  — instant glosses for very common phrases, so
//      "hello" / "thank you" never pay LLM latency or burn quota.
//   2. localOfflineTranslate      — rule-based fallback that NEVER throws, so the
//      avatar keeps signing even when the LLM is offline or rate-limited.
//
// Output shape matches what expandGlosses() in translation.ts consumes.

import {
  KNOWN_SIGNS,
  STOPWORDS,
  WH_WORDS,
  expandContractions,
  lemmatize,
} from './vocab';

export type RawGloss = { gloss: string; confidence?: number; fingerspell?: boolean };
export type Lang = 'ASL' | 'ISL';

// ─── Deterministic phrase map ─────────────────────────────────────────────────
// Keyed by a normalized phrase (lowercase, punctuation stripped, single spaces).
const PHRASE_MAP: Record<string, string[]> = {
  'hello': ['HELLO'],
  'hi': ['HI'],
  'hey': ['HI'],
  'bye': ['BYE'],
  'goodbye': ['GOODBYE'],
  'good morning': ['GOOD', 'MORNING'],
  'good afternoon': ['GOOD', 'AFTERNOON'],
  'good evening': ['GOOD', 'EVENING'],
  'good night': ['GOOD', 'NIGHT'],
  'thank you': ['THANK-YOU'],
  'thanks': ['THANK-YOU'],
  'thank you very much': ['THANK-YOU', 'VERY', 'MUCH'],
  'please': ['PLEASE'],
  'sorry': ['SORRY'],
  'excuse me': ['EXCUSE', 'ME'],
  'yes': ['YES'],
  'no': ['NO'],
  'welcome': ['WELCOME'],
  'you are welcome': ['WELCOME'],
  'how are you': ['HOW', 'YOU'],
  'i am fine': ['I', 'FINE'],
  "i'm fine": ['I', 'FINE'],
  'what is your name': ['YOUR', 'NAME', 'WHAT'],
  "what's your name": ['YOUR', 'NAME', 'WHAT'],
  'my name is': ['MY', 'NAME'],
  'nice to meet you': ['NICE', 'MEET', 'YOU'],
  'i love you': ['I', 'LOVE', 'YOU'],
  'i need help': ['I', 'NEED', 'HELP'],
  'help me': ['HELP', 'ME'],
  'i understand': ['I', 'UNDERSTAND'],
  "i don't understand": ['I', 'NOT', 'UNDERSTAND'],
  'namaste': ['NAMASTE'],
};

/** Normalize a phrase for map lookup: lowercase, strip punctuation, squeeze spaces. */
function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'’\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Instant match for common phrases. Returns null on miss so the caller can
 * escalate to the LLM. Matches the whole input only (keeps results predictable).
 */
export function checkDeterministicMapping(text: string, _language: Lang): RawGloss[] | null {
  const key = normalizePhrase(text);
  const hit = PHRASE_MAP[key];
  if (!hit) return null;
  return hit.map(g => ({ gloss: g, confidence: 1, fingerspell: false }));
}

// ─── Rule-based offline translator ────────────────────────────────────────────
/**
 * Convert free text to glosses with no network. Strips stopwords, lemmatizes to
 * known signs, fingerspells unknown words/proper nouns, and applies a light
 * word-order heuristic (ASL topic-comment: WH-words last; ISL: verb-final).
 * Always returns at least one gloss — never throws.
 */
export function localOfflineTranslate(text: string, language: Lang): RawGloss[] {
  const expanded = expandContractions(text);
  const tokens = expanded
    .replace(/[^A-Z0-9'’\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const out: RawGloss[] = [];
  for (let raw of tokens) {
    raw = raw.replace(/^['’-]+|['’-]+$/g, '');
    if (!raw) continue;
    const upper = raw.toUpperCase();

    // numbers → fingerspell digit-by-digit (handled downstream by expand)
    if (/^[0-9]+$/.test(upper)) {
      out.push({ gloss: upper, confidence: 0.9, fingerspell: true });
      continue;
    }

    if (STOPWORDS.has(upper)) continue; // drop articles, copula, prepositions

    const lemma = lemmatize(upper);
    if (KNOWN_SIGNS.has(lemma)) {
      out.push({ gloss: lemma, confidence: 0.85, fingerspell: false });
    } else {
      // unknown word with no established sign → fingerspell it
      out.push({ gloss: upper, confidence: 0.6, fingerspell: true });
    }
  }

  if (out.length === 0) return [{ gloss: 'UNKNOWN', confidence: 0.3, fingerspell: false }];

  return reorder(out, language);
}

/** Light grammar reorder. ASL: move WH-words to clause end. ISL: push verbs last. */
function reorder(glosses: RawGloss[], language: Lang): RawGloss[] {
  if (language === 'ASL') {
    const wh = glosses.filter(g => WH_WORDS.has(g.gloss));
    if (wh.length === 0) return glosses;
    const rest = glosses.filter(g => !WH_WORDS.has(g.gloss));
    return [...rest, ...wh];
  }
  // ISL → SOV: keep order but move WH last too (closest cheap heuristic)
  const wh = glosses.filter(g => WH_WORDS.has(g.gloss));
  const rest = glosses.filter(g => !WH_WORDS.has(g.gloss));
  return [...rest, ...wh];
}
