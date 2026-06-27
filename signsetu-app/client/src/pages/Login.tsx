import { AuthUI } from '@/components/ui/auth-ui';
import { getLoginUrl } from '@/const';

export default function Login() {
  // Backend auth is Google OAuth only — every CTA routes to the real login.
  const handleAuth = () => { window.location.href = getLoginUrl(); };
  return <AuthUI onAuth={handleAuth} />;
}
