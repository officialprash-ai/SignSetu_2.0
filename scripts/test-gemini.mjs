/**
 * Live Gemini STT smoke test — run on a machine with internet access to Google.
 *
 *   node scripts/test-gemini.mjs                       # tests YouTube path
 *   node scripts/test-gemini.mjs path/to/audio.mp3     # tests uploaded-file path
 *
 * Reads GEMINI_API_KEY / GEMINI_MODEL from .env (or the environment).
 */
import fs from "fs";
import path from "path";

// --- load .env (simple parser, no deps) ---
try {
  const env = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com";

if (!KEY) {
  console.error("✗ GEMINI_API_KEY not set (in .env or environment). Get one at https://aistudio.google.com/apikey");
  process.exit(1);
}
console.log(`model=${MODEL}  key=${KEY.slice(0, 5)}…(${KEY.length} chars)`);

const SCHEMA = {
  type: "object",
  properties: { language: { type: "string" }, text: { type: "string" } },
  required: ["language", "text"],
};
const PROMPT = "Transcribe all spoken words in this media verbatim into plain text. If there is no speech, return an empty transcript.";

async function generate(mediaPart) {
  const url = `${BASE}/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = {
    contents: [{ parts: [mediaPart, { text: PROMPT }] }],
    generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: SCHEMA },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error(`no transcript (finishReason=${data?.candidates?.[0]?.finishReason || "?"})`);
  return JSON.parse(raw);
}

const fileArg = process.argv[2];
const t0 = Date.now();
try {
  let result;
  if (fileArg) {
    const buf = fs.readFileSync(fileArg);
    const ext = path.extname(fileArg).slice(1).toLowerCase();
    const mime =
      { mp3: "audio/mp3", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg", webm: "audio/webm", mp4: "video/mp4" }[ext] ||
      "application/octet-stream";
    console.log(`Transcribing local file (${(buf.length / 1024).toFixed(0)} KB, ${mime})…`);
    result = await generate({ inline_data: { mime_type: mime, data: buf.toString("base64") } });
  } else {
    const yt = "https://www.youtube.com/watch?v=jNQXAC9IVRw"; // first YouTube video, 19s
    console.log(`Transcribing YouTube: ${yt} …`);
    result = await generate({ file_data: { file_uri: yt } });
  }
  console.log(`\n✓ OK in ${Date.now() - t0}ms`);
  console.log(`language: ${result.language}`);
  console.log(`text: ${result.text}`);
} catch (e) {
  console.error(`\n✗ FAILED in ${Date.now() - t0}ms: ${e.message}`);
  process.exit(1);
}
