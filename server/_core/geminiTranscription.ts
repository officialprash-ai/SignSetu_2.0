/**
 * Gemini speech-to-text engine for SignSetu.
 *
 * Primary transcription path for all three input sources:
 *   1. Uploaded video  → bytes → transcribeBufferWithGemini
 *   2. Recorded audio   → bytes → transcribeBufferWithGemini
 *   3. YouTube URL      → url   → transcribeYouTubeWithGemini (native ingestion, no download)
 *
 * Uses the Gemini REST API directly (no SDK dependency). Small media (<~18MB)
 * is sent inline as base64; larger media is uploaded via the File API first.
 */
import { ENV } from "./env";

const API_BASE = "https://generativelanguage.googleapis.com";
const INLINE_LIMIT_BYTES = 18 * 1024 * 1024; // stay under the ~20MB request cap

export type GeminiTranscript = {
  /** Full transcript text */
  text: string;
  /** BCP-47 / ISO language code Gemini detected (e.g. "en", "hi") */
  language: string;
};

export type GeminiOptions = {
  /** Optional language hint (ISO code) */
  language?: string;
  /** Optional custom instruction overriding the default transcription prompt */
  prompt?: string;
};

function buildPrompt(opts?: GeminiOptions): string {
  if (opts?.prompt) return opts.prompt;
  const langHint = opts?.language
    ? ` The primary spoken language is "${opts.language}".`
    : "";
  return (
    "Transcribe all spoken words in this media verbatim into plain text." +
    langHint +
    " Do not add commentary, timestamps, or speaker labels unless spoken." +
    " If there is no speech, return an empty transcript."
  );
}

// JSON schema forces clean { language, text } output — no markdown to strip.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    language: { type: "string" },
    text: { type: "string" },
  },
  required: ["language", "text"],
};

function requireKey(): string {
  if (!ENV.geminiApiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Get a key at https://aistudio.google.com/apikey"
    );
  }
  return ENV.geminiApiKey;
}

/** Low-level generateContent call given a media part (inline_data or file_data). */
async function generate(
  mediaPart: Record<string, unknown>,
  opts?: GeminiOptions
): Promise<GeminiTranscript> {
  const key = requireKey();
  const url = `${API_BASE}/v1beta/models/${ENV.geminiModel}:generateContent?key=${key}`;

  const body = {
    contents: [
      { parts: [mediaPart, { text: buildPrompt(opts) }] },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Gemini transcription failed: ${res.status} ${res.statusText}${errText ? ` — ${errText}` : ""}`
    );
  }

  const data = (await res.json()) as any;
  const raw: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!raw) {
    const reason = data?.candidates?.[0]?.finishReason || "no content";
    throw new Error(`Gemini returned no transcript (${reason})`);
  }

  try {
    const parsed = JSON.parse(raw) as GeminiTranscript;
    return {
      text: (parsed.text ?? "").trim(),
      language: parsed.language || opts?.language || "unknown",
    };
  } catch {
    // Fallback: schema not honored, treat raw as plain text
    return { text: raw.trim(), language: opts?.language || "unknown" };
  }
}

/**
 * Transcribe raw audio/video bytes. Uses inline base64 for small files,
 * Gemini File API for large ones.
 */
export async function transcribeBufferWithGemini(
  buffer: Buffer,
  mimeType: string,
  opts?: GeminiOptions
): Promise<GeminiTranscript> {
  requireKey();

  if (buffer.length <= INLINE_LIMIT_BYTES) {
    const mediaPart = {
      inline_data: { mime_type: mimeType, data: buffer.toString("base64") },
    };
    return generate(mediaPart, opts);
  }

  // Large media → File API upload, then reference by URI.
  const fileUri = await uploadToFileApi(buffer, mimeType);
  const mediaPart = { file_data: { mime_type: mimeType, file_uri: fileUri } };
  return generate(mediaPart, opts);
}

/**
 * Transcribe a public YouTube video directly — Gemini fetches the video itself,
 * so no yt-dlp download or storage round-trip is required.
 */
export async function transcribeYouTubeWithGemini(
  youtubeUrl: string,
  opts?: GeminiOptions
): Promise<GeminiTranscript> {
  requireKey();
  const mediaPart = { file_data: { file_uri: youtubeUrl } };
  return generate(mediaPart, opts);
}

/**
 * Upload bytes to the Gemini File API (resumable) and wait until ACTIVE.
 * Returns the file URI usable in file_data parts.
 */
async function uploadToFileApi(buffer: Buffer, mimeType: string): Promise<string> {
  const key = requireKey();
  const numBytes = buffer.length;

  // 1. Start resumable upload session
  const startRes = await fetch(
    `${API_BASE}/upload/v1beta/files?key=${key}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(numBytes),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: "signsetu-media" } }),
    }
  );
  if (!startRes.ok) {
    throw new Error(`Gemini File API start failed: ${startRes.status} ${startRes.statusText}`);
  }
  const uploadUrl = startRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini File API did not return an upload URL");

  // 2. Upload bytes + finalize
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(numBytes),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(buffer),
  });
  if (!uploadRes.ok) {
    throw new Error(`Gemini File API upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }
  const uploaded = (await uploadRes.json()) as any;
  let file = uploaded?.file;
  if (!file?.name || !file?.uri) throw new Error("Gemini File API returned no file handle");

  // 3. Poll until the file is ACTIVE (video/audio needs processing)
  const deadline = Date.now() + 60_000;
  while (file.state === "PROCESSING") {
    if (Date.now() > deadline) throw new Error("Gemini File API processing timed out");
    await new Promise((r) => setTimeout(r, 2000));
    const statRes = await fetch(`${API_BASE}/v1beta/${file.name}?key=${key}`);
    file = (await statRes.json()) as any;
  }
  if (file.state === "FAILED") throw new Error("Gemini File API processing failed");

  return file.uri as string;
}
