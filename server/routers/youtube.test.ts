import { describe, it, expect, vi } from 'vitest';
import { youtubeRouter } from './youtube';
import * as storage from '../storage';
import * as voice from '../_core/voiceTranscription';

// vi.hoisted: vars available in vi.mock factory (which is also hoisted)
const { readdirFn, readFileFn, unlinkFn } = vi.hoisted(() => ({
  readdirFn: vi.fn().mockResolvedValue(['yt_test-uuid-1234.m4a']),
  readFileFn: vi.fn().mockResolvedValue(Buffer.from('dummyaudio')),
  unlinkFn: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../db', () => ({ saveTranslation: vi.fn().mockResolvedValue({}) }));
vi.mock('../storage', () => ({ storagePut: vi.fn() }));
vi.mock('../_core/voiceTranscription', () => ({ transcribeAudio: vi.fn() }));
vi.mock('../translation', () => ({ textToGloss: vi.fn().mockResolvedValue([{ gloss: 'HELLO' }]) }));
vi.mock('crypto', () => ({ randomUUID: () => 'test-uuid-1234' }));

vi.mock('child_process', () => {
  const PROMISIFY_CUSTOM = Symbol.for('nodejs.util.promisify.custom');
  const execMock: any = vi.fn();
  execMock[PROMISIFY_CUSTOM] = async (_cmd: string) => ({
    stdout: '{"title":"Test Video"}',
    stderr: '',
  });
  return { exec: execMock };
});

vi.mock('fs/promises', () => {
  const fsMock = { readdir: readdirFn, readFile: readFileFn, unlink: unlinkFn };
  return { ...fsMock, default: fsMock };
});

describe('Youtube Router', () => {
  describe('transcribe', () => {
    it('should throw BAD_REQUEST if invalid URL is provided', async () => {
      const caller = youtubeRouter.createCaller({} as any);
      await expect(caller.transcribe({ url: 'https://vimeo.com/invalid', language: 'ASL' }))
        .rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('should process a valid youtube url correctly', async () => {
      vi.mocked(storage.storagePut).mockResolvedValue({ url: '/mock.m4a', key: 'key' });
      vi.mocked(voice.transcribeAudio).mockResolvedValue({
        text: 'Hello', task: 'transcribe', language: 'en', duration: 1, segments: [],
      });

      const caller = youtubeRouter.createCaller({ user: { id: 1 } } as any);
      const result = await caller.transcribe({ url: 'https://youtu.be/123456', language: 'ASL' });

      expect(result.transcript).toBe('Hello');
      expect(result.glossSequence).toEqual([{ gloss: 'HELLO' }]);
      expect(storage.storagePut).toHaveBeenCalled();
      expect(voice.transcribeAudio).toHaveBeenCalled();
    });
  });
});
