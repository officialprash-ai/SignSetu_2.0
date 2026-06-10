import { describe, it, expect, vi } from 'vitest';
import { statsRouter } from './stats';
import * as db from '../db';
import { TRPCError } from '@trpc/server';

vi.mock('../db', () => ({
  getStatsOverview: vi.fn(),
  getTopGlosses: vi.fn(),
}));

describe('Stats Router', () => {
  // adminProcedure mocking can be tricky depending on tRPC context setup, 
  // but caller initialization requires meeting context properties.
  const adminCtx = {
    user: { id: 1, role: 'admin' }, 
  };

  describe('overview', () => {
    it('should return database overview counts', async () => {
      const mockStats = { totalUsers: 10, totalTranslations: 100, todayTranslations: 5 };
      vi.mocked(db.getStatsOverview).mockResolvedValue(mockStats);

      const caller = statsRouter.createCaller(adminCtx as any);
      const result = await caller.overview();

      expect(result).toEqual(mockStats);
      expect(db.getStatsOverview).toHaveBeenCalled();
    });

    it('should throw INTERNAL_SERVER_ERROR if db is unavailable', async () => {
      vi.mocked(db.getStatsOverview).mockResolvedValue(null);

      const caller = statsRouter.createCaller(adminCtx as any);
      await expect(caller.overview()).rejects.toThrowError(TRPCError);
      await expect(caller.overview()).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
    });
  });

  describe('topGlosses', () => {
    it('should retrieve top glosses map limited by input', async () => {
      const mockTop = [{ language: 'ASL', gloss: 'HELLO', count: 50 }];
      vi.mocked(db.getTopGlosses).mockResolvedValue(mockTop);

      const caller = statsRouter.createCaller(adminCtx as any);
      const result = await caller.topGlosses({ limit: 5 });

      expect(db.getTopGlosses).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockTop);
    });
  });
});