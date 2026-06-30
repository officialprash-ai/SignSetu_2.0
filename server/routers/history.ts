import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../_core/trpc';
import { getUserTranslationHistory, deleteUserTranslationHistory } from '../db';

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

  /**
   * Permanently deletes ALL of the signed-in user's translation history.
   */
  clear: publicProcedure.mutation(async ({ ctx }) => {
    const userId = (ctx as any)?.user?.id as number | undefined;
    if (!userId) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Sign in to manage your history',
      });
    }

    try {
      const deleted = await deleteUserTranslationHistory(userId);
      return { success: true, deleted };
    } catch (err) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to clear history',
        cause: err,
      });
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
