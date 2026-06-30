/**
 * Voice transcription helper — powered by the Gemini speech-to-text engine.
 *
 * This module keeps the original public API (transcribeAudio / transcribeAudioBuffer
 * returning a Whisper-shaped response) so existing callers stay unchanged, but the
 * underlying engine is now Gemini (see ./geminiTranscription).
 */
import { ENV } from "./env";
import {
  transcribeBufferWithGemini,
  transcribeYouTubeWithGemini,
  type GeminiTranscript,
} from "./geminiTranscription";

export type TranscribeOptions = {
  audioUrl: string; // URL to the audio file (e.g., S3 URL)
  language?: string; // Optional: specify language code (e.g., "en", "es", "zh")
  prompt?: string; // Optional: custom prompt for the transcription
};

// Whisper-compatible segment shape (kept for type compatibility with callers).
export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

// Whisper-compatible response shape returned to callers.
export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

/** Map a Gemini transcript into the Whisper-shaped response callers expect. */
function toWhisperShape(g: GeminiTranscript): TranscriptionResponse {
  return {
    task: "transcribe",
    language: g.language,
    duration: 0,
    text: g.text,
    segments: [],
  };
}

function missingKeyError(): TranscriptionError {
  return {
    error: "Transcription API key is not configured",
    code: "SERVICE_ERROR",
    details: "Set GEMINI_API_KEY in your environment variables (https://aistudio.google.com/apikey)",
  };
}

/**
 * Transcribe audio/video from a URL: download the bytes, then send to Gemini.
 */
export async function transcribeAudio(
  options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  if (!ENV.geminiApiKey) return missingKeyError();

  let audioBuffer: Buffer;
  let mimeType: string;
  try {
    const response = await fetch(options.audioUrl);
    if (!response.ok) {
      return {
        error: "Failed to download audio file",
        code: "INVALID_FORMAT",
        details: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    audioBuffer = Buffer.from(await response.arrayBuffer());
    mimeType = response.headers.get("content-type") || "audio/mpeg";
  } catch (error) {
    return {
      error: "Failed to fetch audio file",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }

  return transcribeAudioBuffer(audioBuffer, mimeType, {
    language: options.language,
    prompt: options.prompt,
  });
}

/**
 * Transcribe audio/video directly from a Buffer via Gemini.
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  mimeType: string,
  opts?: { language?: string; prompt?: string }
): Promise<TranscriptionResponse | TranscriptionError> {
  if (!ENV.geminiApiKey) return missingKeyError();

  try {
    const result = await transcribeBufferWithGemini(audioBuffer, mimeType, opts);
    return toWhisperShape(result);
  } catch (error) {
    return {
      error: "Voice transcription failed",
      code: "TRANSCRIPTION_FAILED",
      details: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Transcribe a public YouTube video directly via Gemini (no download needed).
 */
export async function transcribeYouTube(
  youtubeUrl: string,
  opts?: { language?: string; prompt?: string }
): Promise<TranscriptionResponse | TranscriptionError> {
  if (!ENV.geminiApiKey) return missingKeyError();

  try {
    const result = await transcribeYouTubeWithGemini(youtubeUrl, opts);
    return toWhisperShape(result);
  } catch (error) {
    return {
      error: "YouTube transcription failed",
      code: "TRANSCRIPTION_FAILED",
      details: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
