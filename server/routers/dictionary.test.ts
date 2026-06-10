import { describe, it, expect, vi } from 'vitest';
import { dictionaryRouter } from './dictionary';
import * as db from '../db';
import { TRPCError } from '@trpc/server';

// Mock the db module
vi.mock('../db', () => ({
  searchDictionary: vi.fn(),
  getSignByGloss: vi.fn(),
  seedDictionary: vi.fn(),
}));

describe('Dictionary Router', () => {
  describe('search', () => {
    it('should call searchDictionary with correct parameters', async () => {
      const mockResults = [
        { id: 1, gloss: 'HELLO', language: 'ASL', poseUrl: '/hello.pose' }
      ];
      vi.mocked(db.searchDictionary).mockResolvedValue(mockResults as any);

      const caller = dictionaryRouter.createCaller({} as any);
      const result = await caller.search({
        query: 'hell',
        language: 'ASL',
        limit: 10
      });

      expect(db.searchDictionary).toHaveBeenCalledWith('hell', 'ASL', undefined, 10);
      expect(result).toEqual(mockResults);
    });
  });

  describe('getByGloss', () => {
    it('should return sign if found', async () => {
      const mockSign = { id: 1, gloss: 'HELLO', language: 'ASL', poseUrl: '/hello.pose' };
      vi.mocked(db.getSignByGloss).mockResolvedValue(mockSign as any);

      const caller = dictionaryRouter.createCaller({} as any);
      const result = await caller.getByGloss({ gloss: 'HELLO', language: 'ASL' });

      expect(result).toEqual(mockSign);
    });

    it('should throw NOT_FOUND error if sign is not found', async () => {
      vi.mocked(db.getSignByGloss).mockResolvedValue(null);

      const caller = dictionaryRouter.createCaller({} as any);
      
      await expect(caller.getByGloss({ gloss: 'UNKNOWN', language: 'ASL' })).rejects.toThrowError(TRPCError);
      await expect(caller.getByGloss({ gloss: 'UNKNOWN', language: 'ASL' })).rejects.toMatchObject({
        code: 'NOT_FOUND'
      });
    });
  });

  describe('suggest', () => {
    it('should call searchDictionary with limit 3', async () => {
      vi.mocked(db.searchDictionary).mockResolvedValue([] as any);

      const caller = dictionaryRouter.createCaller({} as any);
      await caller.suggest({ word: 'TEST', language: 'ISL' });

      expect(db.searchDictionary).toHaveBeenCalledWith('TEST', 'ISL', undefined, 3);
    });
  });
});