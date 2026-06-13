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
  const [ready, setReady] = useState(fal