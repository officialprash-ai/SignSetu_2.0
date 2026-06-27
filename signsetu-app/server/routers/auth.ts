import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { getSessionCookieOptions } from '../_core/cookies';
import { COOKIE_NAME } from '@shared/const';
import { getOrCreateUserPreferences, updateUserPreferences, upsertUser } from '../db';
import { TRPCError } from '@trpc/server';

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),

  profile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.user;
      const prefs = await getOrCreateUserPreferences(user.id).catch(() => null);
      
      return {
        user,
        preferences: prefs
      };
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      preferredLanguage: z.enum(['ASL', 'ISL']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      
      if (input.name) {
        // Upsert user needs InsertUser which uses openId. 
        // We will just do it through our upsert or add a targeted update name.
        // Actually, upsertUser expects openId.
        await upsertUser({
          openId: user.openId,
          name: input.name,
        }).catch(err => {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update user name',
            cause: err
          });
        });
      }

      if (input.preferredLanguage) {
        await updateUserPreferences(user.id, {
          preferredLanguage: input.preferredLanguage
        }).catch(err => {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to update preferences',
            cause: err
          });
        });
      }

      return { success: true };
    }),
});