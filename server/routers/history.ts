import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getUserTranslationHistory } from '../db';

export const historyRouter = router({
  /**
   * Returns the signed-in user's translation history, newest first.
   * Falls back to [] when DB is unavailable or user is not authenticated.
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(200).default(50),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const userId = (ctx as any)?.user?.id as number | undefined;
      if (!userId) return { items: [] };

      const limit = input?.limit ?? 50;

      try {
        const rows = await getUserTranslationHistory(userId, limit);
        return {
          items: rows.map(r => ({
            id:           r.id,
            text:         r.inputText,
            language:     r.language,
            glosses:      tryParseGlosses(r.glossSequence),
            sourceType:   r.sourceType,
            createdAt:    r.createdAt.toISOString(),
          })),
        };
      } catch {
        return { items: [] };
      }
    }),
});

function tryParseGlosses(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
}
