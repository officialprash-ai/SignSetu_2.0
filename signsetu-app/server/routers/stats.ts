import { z } from 'zod';
import { adminProcedure, router } from '../_core/trpc';
import { getStatsOverview, getTopGlosses } from '../db';
import { TRPCError } from '@trpc/server';

export const statsRouter = router({
  overview: adminProcedure
    .query(async () => {
      const overview = await getStatsOverview();
      if (!overview) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }
      return overview;
    }),

  topGlosses: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(10)
    }).optional())
    .query(async ({ input }) => {
      return getTopGlosses(input?.limit);
    }),
});