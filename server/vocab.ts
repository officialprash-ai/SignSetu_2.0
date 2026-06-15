// ─── Shared ASL/ISL vocabulary + lexical helpers ──────────────────────────────
// Single source of truth for the known-sign set, stopwords and light lemmatizer.
// Imported by translation.ts (LLM path) and offlineTranslate.ts (fallback path)
// so both agree on what counts as an established sign.

/** Core ASL/ISL vocabulary — glosses with an established sign in the avatar. */
export const KNOWN_SIGNS = new Set<string>([
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

/** Function words dropped in sign-language gloss (articles, copula, prepositions). */
export const STOPWORDS = new Set<string>([
  'A','AN','THE','OF','TO','IN','ON','AT','FOR','WITH','BY','FROM','AS','INTO',
  'AM','IS','ARE','WAS','WERE','BE','BEEN','BEING','THAT','THIS','THESE','THOSE',
  'DOES','DID','WILL','WOULD','SHALL','SHOULD','MAY','MIGHT','CAN','COULD',
  'AND','OR','BUT','SO','THAN','THEN','THERE','HERE',
]);

/** WH-question words — moved to the end of an ASL clause (topic-comment). */
export const WH_WORDS = new Set<string>(['WHAT','WHERE','WHEN','WHO','WHY','HOW','WHICH']);

/** Contractions expanded before tokenizing. */
const CONTRACTIONS: Record<string, string> = {
  "I'M": 'I AM', "I'VE": 'I HAVE', "I'LL": 'I WILL', "I'D": 'I WOULD',
  "YOU'RE": 'YOU ARE', "YOU'VE": 'YOU HAVE', "YOU'LL": 'YOU WILL',
  "HE'S": 'HE IS', "SHE'S": 'SHE IS', "IT'S": 'IT IS', "THAT'S": 'THAT IS',
  "WE'RE": 'WE ARE', "THEY'RE": 'THEY ARE', "WHAT'S": 'WHAT IS',
  "WHERE'S": 'WHERE IS', "WHO'S": 'WHO IS', "DON'T": 'DO NOT',
  "DOESN'T": 'DOES NOT', "DIDN'T": 'DID NOT', "CAN'T": 'CAN NOT',
  "WON'T": 'WILL NOT', "ISN'T": 'IS NOT', "AREN'T": 'ARE NOT',
  "WASN'T": 'WAS NOT', "AREN’T": 'ARE NOT', "LET'S": 'LET US',
};

/** Map common inflected forms back to a base sign. */
const IRREGULAR_LEMMA: Record<string, string> = {
  CHILDREN: 'CHILD', PEOPLE: 'PERSON', MEN: 'MAN', WOMEN: 'WOMAN',
  WENT: 'GO', GONE: 'GO', SAID: 'SAY', TOLD: 'TELL', MADE: 'MAKE',
  GAVE: 'GIVE', GOT: 'GET', TOOK: 'TAKE', SAW: 'SEE', HEARD: 'HEAR',
  ATE: 'EAT', SLEPT: 'SLEEP', BOUGHT: 'BUY', FOUND: 'FIND', LOST: 'LOSE',
  BETTER: 'GOOD', BEST: 'GOOD', WORSE: 'BAD', WORST: 'BAD',
};

/** Expand contractions, returning a normalized UPPERCASE string. */
export function expandContractions(text: string): string {
  let t = ` ${text.toUpperCase()} `;
  for (const [k, v] of Object.entries(CONTRACTIONS)) {
    t = t.replace(new RegExp(`\\b${k.replace(/'/g, "['’]")}\\b`, 'g'), ` ${v} `);
  }
  return t.trim();
}

/**
 * Light lemmatizer: reduce a word to its base sign when one exists.
 * Returns the UPPERCASE base if found in KNOWN_SIGNS, else the original word.
 */
export function lemmatize(word: string): string {
  const w = word.toUpperCase();
  if (KNOWN_SIGNS.has(w)) return w;
  if (IRREGULAR_LEMMA[w]) return IRREGULAR_LEMMA[w];
  // suffix stripping — longest first
  const tries = [
    w.replace(/IES$/, 'Y'),
    w.replace(/(SS)$/, '$1'),
    w.replace(/S$/, ''),
    w.replace(/ING$/, ''),
    w.replace(/ING$/, 'E'),
    w.replace(/ED$/, ''),
    w.replace(/ED$/, 'E'),
    w.replace(/ER$/, ''),
    w.replace(/EST$/, ''),
  ];
  for (const t of tries) {
    if (t !== w && KNOWN_SIGNS.has(t)) return t;
  }
  return w;
}

/** True when the (uppercased) token is a single A–Z0–9 character. */
export function isFingerspellChar(c: string): boolean {
  return /^[A-Z0-9]$/.test(c);
}
