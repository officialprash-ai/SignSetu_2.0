import { invokeLLM } from "./_core/llm";

export interface GlossSequence {
  gloss: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

/**
 * Convert English text to sign language glosses using LLM
 * Applies grammar rules based on language (SVO for ASL, SOV for ISL)
 */
export async function textToGloss(
  text: string,
  language: 'ASL' | 'ISL'
): Promise<GlossSequence[]> {
  const grammarInstruction = language === 'ASL'
    ? 'Convert to ASL glosses using SVO (Subject-Verb-Object) word order. Remove articles and prepositions. Use UPPERCASE for glosses.'
    : 'Convert to ISL glosses using SOV (Subject-Object-Verb) word order. Remove copula and articles. Use UPPERCASE for glosses.';

  const systemPrompt = `You are a sign language translation expert. ${grammarInstruction}
Return a JSON array of glosses with this structure:
[{"gloss": "WORD", "confidence": 0.95}, ...]
Only return valid JSON, no other text.`;

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

    // Parse JSON response
    let glosses: Array<{ gloss: string; confidence?: number }>;
    try {
      glosses = JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse LLM response as JSON: ${content}`);
    }
    
    if (!Array.isArray(glosses)) {
      throw new Error('LLM response is not an array');
    }

    // Convert to GlossSequence with timing
    const sequences: GlossSequence[] = [];
    let currentMs = 0;
    const glossDurationMs = 500; // Default 500ms per gloss

    for (const item of glosses) {
      sequences.push({
        gloss: item.gloss || 'UNKNOWN',
        startMs: currentMs,
        endMs: currentMs + glossDurationMs,
        confidence: item.confidence || 0.8,
      });
      currentMs += glossDurationMs;
    }

    return sequences;
  } catch (error) {
    console.error('Error in textToGloss:', error);
    throw new Error(`Failed to convert text to gloss: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse gloss sequence to extract individual glosses for dictionary lookup
 */
export function extractGlosses(sequence: GlossSequence[]): string[] {
  return sequence.map(item => item.gloss.toUpperCase());
}

/**
 * Check if a gloss is a fingerspelling candidate (single letter or number)
 */
export function isFingerspellingCandidate(gloss: string): boolean {
  const normalized = gloss.toUpperCase();
  return normalized.length === 1 && /^[A-Z0-9]$/.test(normalized);
}

/**
 * Convert a word to fingerspelling sequence
 */
export function wordToFingerspelling(word: string): string[] {
  return word.toUpperCase().split('');
}
