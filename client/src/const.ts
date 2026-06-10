export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate Google OAuth URL at runtime so redirect URI reflects the current origin.
// Uses URLSearchParams + string concat instead of new URL() to avoid a production
// environment bug where the URL constructor throws "Invalid URL" for absolute strings.
export const getLoginUrl = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
 