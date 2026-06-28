export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Whisper / transcription — defaults to Groq (fastest + cheapest Whisper hosting).
  // Set GROQ_API_KEY for free transcription. Falls back to OpenAI if not set.
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL || "https://api.groq.com/openai/",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "",
};
