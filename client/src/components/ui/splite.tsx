'use client';
import * as React from 'react';
import { useEffect, useState } from 'react';

// Load the Spline viewer web component from CDN — avoids bundling the heavy
// @splinetool/runtime npm package (which was stalling the Railway build).
const VIEWER_SRC = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (customElements.get('spline-viewer')) { setReady(true); return; }
    if (!document.querySelector('script[data-spline-viewer]')) {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = VIEWER_SRC;
      s.dataset.splineViewer = '1';
      document.head.appendChild(s);
    }
    let alive = true;
    customElements.whenDefined('spline-viewer').then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  return (
    <div className={className} style={{ position: 'relative' }}>
      {!ready && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="loader" />
        </div>
      )}
      {ready &&
        React.createElement('spline-viewer', {
          url: scene,
          style: { width: '100%', height: '100%', display: 'block' },
        })}
    </div>
  );
}
