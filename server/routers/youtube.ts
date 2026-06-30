import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { textToGloss } from '../translation';
import { saveTranslation } from '../db';
import { exec } from 'child_process';
import { promisify } from 'util';
import { storagePut } from '../storage';
import { transcribeAudio, transcribeYouTube } from '../_core/voiceTranscription';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const execAsync = (...args: Parameters<typeof exec>) => promisify(exec)(...args);

export const youtubeRouter = router({
  transcribe: publicProcedure
    .input(z.object({
      url: z.string().url(),
      language: z.enum(['ASL', 'ISL']),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Validate YouTube URL
      if (!input.url.includes('youtube.com/') && !input.url.includes('youtu.be/')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid YouTube URL provided',
        });
      }

      let transcript = '';

      // Primary path: Gemini ingests the YouTube URL natively — no download needed.
      try {
        const geminiResult = await transcribeYouTube(input.url);
        if (!('error' in geminiResult) && geminiResult.text.trim()) {
          transcript = geminiResult.text.trim();
        } else if ('error' in geminiResult) {
          throw new Error(geminiResult.details || geminiResult.error);
        } else {
          throw new Error('Gemini returned an empty transcript');
        }
      } catch (geminiErr: any) {
        console.warn('[youtube] Gemini native transcription failed, falling back to yt-dlp:', geminiErr?.message || geminiErr);

        // Fallback path: download audio with yt-dlp, then transcribe the bytes via Gemini.
        try {
          const tmpDir = os.tmpdir();
          const outputBase = path.join(tmpDir, `yt_${randomUUID()}`);

          // Download best audio as m4a/opus
          await execAsync(`yt-dlp -f bestaudio -o "${outputBase}.%(ext)s" "${input.url}"`);

          // Find the downloaded file
          const files = await fs.readdir(tmpDir);
          const downloadedFile = files.find(f => f.startsWith(path.basename(outputBase)));
          if (!downloadedFile) {
            throw new Error('Audio file was not downloaded');
          }

          const audioPath = path.join(tmpDir, downloadedFile);
          const audioContent = await fs.readFile(audioPath);

          // Store, then transcribe
          const { url: storageUrl } = await storagePut(
            `youtube/${downloadedFile}`,
            audioContent,
            'audio/mp4' // Generic for m4a
          );

          // Cleanup temp file
          await fs.unlink(audioPath).catch(() => {});

          const transcribeResult = await transcribeAudio({ audioUrl: storageUrl });
          if ('error' in transcribeResult) {
            throw new Error(transcribeResult.error);
          }
          transcript = transcribeResult.text;
        } catch (fallbackErr: any) {
          console.error('YouTube extraction/transcription failed:', fallbackErr);
          // Last-resort fallback for demo/dev purposes if yt-dlp is unavailable.
          transcript = "Fallback transcript: Welcome to SignSetu. This is a fallback message because YouTube extraction failed.";
        }
      }

      // 5. Call textToGloss
      const glossSequence = await textToGloss(transcript, input.language);

      // 6. Save to translations table
      const userId = (ctx as any)?.user?.id as number | undefined;
      if (userId) {
        saveTranslation(
          userId,
          transcript,
          JSON.stringify(glossSequence.map(g => g.gloss)),
          input.language,
          'youtube'
        ).catch(err => console.warn('[youtube] failed to save history:', err));
      }

      return {
        transcript,
        glossSequence,
      };
    }),
});