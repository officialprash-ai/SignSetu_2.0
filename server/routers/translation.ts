import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { textToGloss } from '../translation';
import { saveTranslation } from '../db';

export const translationRouter = router({
  textToSign: publicProcedure
    .input(
      z.object({
        text:       z.string().min(1).max(1000),
        language:   z.enum(['ASL', 'ISL']),
        sourceType: z.enum(['text', 'audio', 'youtube']).default('text'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const glossSequence = await textToGloss(input.text, input.language);

      // Fire-and-forget DB save for logged-in users
      const userId = (ctx as any)?.user?.id as number | undefined;
      if (userId) {
        saveTranslation(
          userId,
          input.text,
          JSON.stringify(glossSequence.map(g => g.gloss)),
          input.language,
          input.sourceType,
        ).catch(err => console.warn('[translation] failed to save history:', err));
      }

      return { glossSequence };
    }),

  getPreferences: publicProcedure.query(() => ({
    defaultLanguage: 'ASL' as const,
    playbackSpeed: 1,
  })),
});
