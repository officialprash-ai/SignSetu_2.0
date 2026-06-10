import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { transcribeAudio } from '../_core/voiceTranscription';
import { storagePut } from '../storage';

export const voiceRouter = router({
  /**
   * Upload a base64-encoded audio blob, transcribe it with Whisper,
   * and return the transcription text.
   *
   * Client sends: { audioBase64, mimeType, language? }
   * Server:
   *   1. Decodes base64 → Buffer
   *   2. Uploads to S3 via storagePut
   *   3. Calls transcribeAudio with the resulting URL
   *   4. Returns { text, language, duration }
   */
  transcribe: publicProcedure
    .input(
      z.object({
        audioBase64: z.string().min(1),
        mimeType:    z.string().default('audio/webm'),
        language:    z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Decode
      const audioBuffer = Buffer.from(input.audioBase64, 'base64');

      const ext = mimeToExt(input.mimeType);

      // 2. Upload
      let audioUrl: string;
      try {
        const { url } = await storagePut(
          `voice/${Date.now()}.${ext}`,
          audioBuffer,
          input.mimeType
        );
        // url is a relative /manus-storage/… path — make it absolute
        audioUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
      } catch (err) {
        throw new TRPCError({
          code:    'INTERNAL_SERVER_ERROR',
          message: `Storage upload failed: ${err instanceof Error ? err.message : 'unknown'}`,
        });
      }

      // 3. Transcribe
      const result = await transcribeAudio({ audioUrl, language: input.language });

      if ('error' in result) {
        throw new TRPCError({
          code:    'INTERNAL_SERVER_ERROR',
          message: result.error,
        });
      }

      return {
        text:     result.text.trim(),
        language: result.language,
        duration: result.duration,
      };
    }),
});

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg':  'ogg',
    'audio/mp4':  'm4a',
    'audio/mp3':  'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav':  'wav',
    'audio/wave': 'wav',
  };
  return map[mime] ?? 'webm';
}
