import { invokeLLM } from "./_core/llm";

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

// ─── Core ASL/ISL vocabulary ─────────────────────────────────────────────────
const KNOWN_SIGNS = new Set([
  'I','ME','MY','MINE','YOU','YOUR','HE','SHE','HIS','HER','IT','ITS',
  'WE','US','OUR','THEY','THEM','THEIR',
  'HELLO','HI','BYE','GOODBYE','GOOD','MORNING','AFTERNOON','EVENING','NIGHT',
  'PLEASE','THANK','THANK-YOU','SORRY','WELCOME','EXCUSE',
  'WHAT','WHERE','WHEN','WHO','WHY','HOW','WHICH',
  'BE','IS','ARE','WAS','WERE','HAVE','HAS','HAD','DO','DID','DOES',
  'GO','COME','WANT','NEED','LIKE','LOVE','KNOW','THINK','SEE','HEAR',
  'SAY','TELL','ASK','GIVE','GET','TAKE','MAKE','USE','HELP',
  'EAT','DRINK','SLEEP','WORK','PLAY','LEARN','STUDY','TEACH','READ','WRITE',
  'BUY','SELL','PAY','OPEN','CLOSE','START','STOP','FINISH','WAIT','CALL',
  'UNDERSTAND','REMEMBER','FORGET','FIND','LOSE','SHOW','WATCH','LISTEN',
  'NAME','PERSON','MAN','WOMAN','BOY','GIRL','BABY','CHILD','CHILDREN','FAMILY',
  'MOTHER','MOM','FATHER','DAD','BROTHER','SISTER','FRIEND','TEACHER','DOCTOR',
  'HOUSE','HOME','SCHOOL','WORK','STORE','HOSPITAL','RESTAURANT','CHURCH',
  'FOOD','WATER','MILK','COFFEE','BREAD','FRUIT','VEGETABLE','MONEY','TIME',
  'DAY','WEEK','MONTH','YEAR','TODAY','TOMORROW','YESTERDAY','NOW','LATER',
  'MORNING','AFTERNOON','NIGHT',
  'CAR','BUS','TRAIN','PLANE','BOOK','PHONE','COMPUTER',
  'CITY','COUNTRY','WORLD',
  'ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN',
  'FIRST','SECOND','THIRD','LAST','NEXT','BEFORE','AFTER',
  'BIG','SMALL','TALL','SHORT','FAST','SLOW','HOT','COLD','NEW','OLD',
  'GOOD','BAD','HAPPY','SAD','ANGRY','SCARED','SICK','WELL','TIRED','HUNGRY',
  'FULL','EMPTY','OPEN','CLOSED','RIGHT','LEFT','UP','DOWN','HERE','THERE',
  'SAME','DIFFERENT','EASY','HARD','IMPORTANT','BEAUTIFUL','BLACK','WHITE',
  'RED','BLUE','GREEN','YELLOW',
  'AND','OR','BUT','IF','BECAUSE','SO','ALSO','AGAIN','MORE','LESS','VERY',
  'NOT','NO','YES','MAYBE','ALL','SOME','MANY','FEW','MUCH','ENOUGH',
  'NAMASTE','INDIA','HINDI','ENGLISH',
]);

export async function textToGloss(
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
