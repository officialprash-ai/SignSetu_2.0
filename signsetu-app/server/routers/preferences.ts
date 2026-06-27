import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getOrCreateUserPreferences, updateUserPreferences } from '../db';

export const preferencesRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    const userId = (ctx as any)?.user?.id as number | undefined;
    const defaults = { defaultLanguage: 'ASL' as const, playbackSpeed: 1.0 };

    if (!userId) return defaults;

    try {
      const prefs = await getOrCreateUserPreferences(userId);
      return {
        defaultLanguage: prefs.preferredLanguage as 'ASL' | 'ISL',
        // DB stores speed as integer 50–200 (percent); convert to 0.5–2.0 float
        playbackSpeed:   (prefs.playbackSpeed ?? 100) / 100,
      };
    } catch {
      return defaults;
    }
  }),

  set: publicProcedure
    .input(
      z.object({
        defaultLanguage: z.enum(['ASL', 'ISL']).optional(),
        playbackSpeed:   z.number().min(0.5).max(2.0).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = (ctx as any)?.user?.id as number | undefined;
      if (!userId) return { ok: false };

      const updates: Parameters<typeof updateUserPreferences>[1] = {};
      if (input.defaultLanguage) updates.preferredLanguage = input.defaultLanguage;
      if (input.playbackSpeed   !== undefined) updates.playbackSpeed = Math.round(input.playbackSpeed * 100);

      await updateUserPreferences(userId, updates).catch(() => {});
      return { ok: true };
    }),
});
