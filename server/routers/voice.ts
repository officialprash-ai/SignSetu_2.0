import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { transcribeAudioBuffer } from '../_core/voiceTranscription';

export const voiceRouter = router({
  /**
   * Accepts a base64-encoded audio/video blob, decodes it, and sends it
   * directly to Whisper — no intermediate storage upload needed.
   *
   * Client sends: { audioBase64, mimeType, language? }
   * Server:
   *   1. Decodes base64 → Buffer
   *   2. Sends Buffer straight to Whisper via transcribeAudioBuffer
   *   3. Returns { text, language, duration }
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
      // 1. Decode base64 → Buffer
      const audioBuffer = Buffer.from(input.audioBase64, 'base64');

      // 2. Send directly to Whisper (no storage round-trip)
      const result = await transcribeAudioBuffer(
        audioBuffer,
        input.mimeType,
        { language: input.language }
      );

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
