import { Component, lazy, Suspense, type ReactNode } from 'react';
export type { GlossEntry, SignAvatarProps } from './SignAvatar';

const SignAvatarInner = lazy(() =>
  import('./SignAvatar').then(m => ({ default: m.SignAvatar })).catch(() => ({
    default: () => <AvatarFallback />
  }))
);

import type { SignAvatarProps } from './SignAvatar';

function AvatarFallback() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="text-4xl">🤟</div>
        <span className="text-xs">Avatar unavailable</span>
      </div>
    </div>
  );
}

class AvatarErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? <AvatarFallback /> : this.props.children;
  }
}

export function SignAvatar(props: SignAvatarProps) {
  return (
    <AvatarErrorBoundary>
      <Suspense
        fallback={
          <div className="w-full h-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <span className="text-xs">Loading avatar…</span>
            </div>
          </div>
        }
      >
        <SignAvatarInner {...props} />
      </Suspense>
    </AvatarErrorBoundary>
  );
}
