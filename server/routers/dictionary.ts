import { z } from 'zod';
import { adminProcedure, protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { searchDictionary, getSignByGloss, seedDictionary } from '../db';
import { InsertSignDictionary } from '../../drizzle/schema';
import { TRPCError } from '@trpc/server';

export const dictionaryRouter = router({
  search: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      language: z.enum(['ASL', 'ISL']),
      category: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      return searchDictionary(input.query || '', input.language, input.category, input.limit);
    }),

  getByGloss: publicProcedure
    .input(z.object({
      gloss: z.string(),
      language: z.enum(['ASL', 'ISL']),
    }))
    .query(async ({ input }) => {
      const sign = await getSignByGloss(input.gloss, input.language);
      if (!sign) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Sign '${input.gloss}' not found in ${input.language} dictionary`,
        });
      }
      return sign;
    }),

  suggest: publicProcedure
    .input(z.object({
      word: z.string(),
      language: z.enum(['ASL', 'ISL']),
    }))
    .query(async ({ input }) => {
      const results = await searchDictionary(input.word, input.language, undefined, 3);
      return results;
    }),

  seed: adminProcedure
    .input(z.array(z.object({
      gloss: z.string(),
      language: z.enum(['ASL', 'ISL']),
      poseUrl: z.string(),
      videoUrl: z.string().optional(),
      duration: z.number().optional(),
      category: z.string().optional(),
      priority: z.number().optional(),
    })))
    .mutation(async ({ input }) => {
      const signsToInsert = input as InsertSignDictionary[];
      return seedDictionary(signsToInsert);
    }),
});
