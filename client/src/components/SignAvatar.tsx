// ─── SignAvatar — 2D procedural canvas presenter ─────────────────────────────
// Lightweight HTML5-canvas sign avatar (ported from the SignSetu studio bridge).
// Replaces the previous Three.js/GLB rig: no 3D engine, no model downloads, just
// keyframe poses interpolated with cosine easing at 60fps. Public API unchanged
// so existing consumers (Translator, Dictionary, Profile) need no edits.

import { useEffect, useRef } from 'react';
import {
  type Pose,
  type Joint,
  type FingerState,
  REST_POSE,
  interpolatePose,
  resolveKeyframes,
} from '@/lib/poses2d';

export interface GlossEntry {
  gloss: string;
  startMs: number;
  endMs: number;
  confidence: number;
  fingerspell?: boolean;
}

export type SignLang = 'ASL' | 'ISL';

export interface SignAvatarProps {
  glossSequence?: GlossEntry[];
  isPlaying?: boolean;
  playbackSpeed?: number;
  language?: SignLang;
  onGlossChange?: (index: number) => void;
  onAnimationComplete?: () => void;
}

// Canvas authoring resolution (poses are defined in this coordinate space).
const CANVAS_W = 600;
const CANVAS_H = 730;
const AVATAR_Y_SHIFT = -110;

// Fixed presenter styling (the studio-config UI isn't part of SignSetu).
const SKIN = '#f3d1b6';
const SKIN_ACCENT = '#e0ac8d';
const WARDROBE = { primary: '#f8f9fa', shadow: '#e9ecef', accent: '#dae0e5' };
const HAIR = '#5c4033';

export function SignAvatar({
  glossSequence = [],
  isPlaying = false,
  playbackSpeed = 1,
  language = 'ASL',
  onGlossChange,
  onAnimationComplete,
}: SignAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable playback state (kept in refs so the RAF loop never restarts mid-play).
  const seqRef = useRef<GlossEntry[]>(glossSequence);
  const playingRef = useRef(isPlaying);
  const speedRef = useRef(playbackSpeed);
  const elapsedRef = useRef(0);
  const lastTsRef = useRef(0);
  const activeIdxRef = useRef(-1);
  const completedRef = useRef(false);
  const poseRef = useRef<Pose>(REST_POSE);

  // Keep refs in sync with props without tearing down the animation loop.
  useEffect(() => {
    // New sequence → restart playback clock.
    seqRef.current = glossSequence;
    elapsedRef.current = 0;
    activeIdxRef.current = -1;
    completedRef.current = false;
  }, [glossSequence]);
  useEffect(() => { playingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedRef.current = playbackSpeed; }, [playbackSpeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    lastTsRef.current = performance.now();

    const frame = (now: number) => {
      const delta = now - lastTsRef.current;
      lastTsRef.current = now;

      const seq = seqRef.current;
      const breath = Math.sin(now / 1000) * 1.8;

      // ── Advance playback clock ──────────────────────────────────────────────
      if (playingRef.current && seq.length > 0) {
        elapsedRef.current += delta * speedRef.current;
        const total = seq[seq.length - 1].endMs;
        const ms = elapsedRef.current;

        if (ms >= total) {
          if (!completedRef.current) {
            completedRef.current = true;
            poseRef.current = REST_POSE;
            onAnimationComplete?.();
          }
        } else {
          completedRef.current = false;
          // Find active gloss
          let idx = -1;
          for (let i = 0; i < seq.length; i++) {
            if (ms >= seq[i].startMs && ms < seq[i].endMs) { idx = i; break; }
          }
          if (idx !== activeIdxRef.current) {
            activeIdxRef.current = idx;
            if (idx >= 0) onGlossChange?.(idx);
          }
          if (idx >= 0) {
            poseRef.current = poseForGloss(seq, idx, ms);
          }
        }
      } else if (seq.length === 0) {
        poseRef.current = REST_POSE;
      }

      // ── Render ──────────────────────────────────────────────────────────────
      const shifted = applyBreathing(poseRef.current, breath);
      drawBackground(ctx, CANVAS_W, CANVAS_H);
      drawShadow(ctx, shifted);
      drawHuman(ctx, shifted);
      const caption = activeIdxRef.current >= 0 && playingRef.current && !completedRef.current
        ? glossLabel(seq[activeIdxRef.current])
        : '';
      drawCaption(ctx, CANVAS_W, CANVAS_H, caption);

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // language intentionally excluded — pose resolution reads it via closure-free refs
  }, [onGlossChange, onAnimationComplete]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full h-full object-contain select-none"
      />
    </div>
  );
}

// ─── Playback helpers ─────────────────────────────────────────────────────────
// Double-stage blend: 0–35% transition from previous sign's end, 35–100% execute.
function poseForGloss(seq: GlossEntry[], idx: number, ms: number): Pose {
  const block = seq[idx];
  const progress = (ms - block.startMs) / Math.max(1, block.endMs - block.startMs);
  const keys = resolveKeyframes(block.gloss, block.fingerspell);

  let prev = REST_POSE;
  if (idx > 0) {
    const pk = resolveKeyframes(seq[idx - 1].gloss, seq[idx - 1].fingerspell);
    prev = pk[pk.length - 1];
  }

  if (progress < 0.35) {
    return interpolatePose(prev, keys[0], progress / 0.35);
  }
  const subT = (progress - 0.35) / 0.65;
  return keys.length > 1 ? interpolatePose(keys[0], keys[1], subT) : keys[0];
}

function glossLabel(entry: GlossEntry): string {
  return entry.fingerspell && entry.gloss.length === 1 ? `${entry.gloss} ·` : entry.gloss;
}

function applyBreathing(p: Pose, breath: number): Pose {
  const s = AVATAR_Y_SHIFT;
  return {
    ...p,
    head: { ...p.head, y: p.head.y + s + breath * 0.4 },
    neck: { ...p.neck, y: p.neck.y + s + breath * 0.6 },
    chest: { ...p.chest, y: p.chest.y + s + breath * 0.8 },
    leftShoulder: { ...p.leftShoulder, y: p.leftShoulder.y + s + breath * 0.7 },
    rightShoulder: { ...p.rightShoulder, y: p.rightShoulder.y + s + breath * 0.7 },
    leftElbow: { ...p.leftElbow, y: p.leftElbow.y + s },
    rightElbow: { ...p.rightElbow, y: p.rightElbow.y + s },
    leftWrist: { ...p.leftWrist, y: p.leftWrist.y + s },
    rightWrist: { ...p.rightWrist, y: p.rightWrist.y + s },
  };
}

// ─── Canvas drawing ───────────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(0, 0, w, h);
  const grad = ctx.createRadialGradient(w / 2, h / 3, 50, w / 2, h / 2, h);
  grad.addColorStop(0, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(0,0,0,0.03)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Minimalist floor
  const floorY = 520;
  ctx.fillStyle = '#fcf9f5';
  ctx.fillRect(0, floorY, w, h - floorY);
  ctx.strokeStyle = '#eae2d8';
  ctx.lineWidth = 1.8;
  for (let x = -200; x <= w + 200; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x + (x - w / 2) * 1.5, h);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, floorY - 12, w, 12);
}

function drawShadow(ctx: CanvasRenderingContext2D, p: Pose) {
  ctx.save();
  ctx.filter = 'blur(18px)';
  ctx.fillStyle = 'rgba(0,0,0,0.055)';
  const dx = -45;
  const dy = 15;
  ctx.beginPath();
  ctx.arc(p.head.x + dx, p.head.y + dy, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(p.leftShoulder.x + dx - 20, p.leftShoulder.y + dy + 150);
  ctx.quadraticCurveTo(p.leftShoulder.x + dx - 10, p.leftShoulder.y + dy, p.chest.x + dx, p.chest.y + dy);
  ctx.quadraticCurveTo(p.rightShoulder.x + dx + 10, p.rightShoulder.y + dy, p.rightShoulder.x + dx + 20, p.rightShoulder.y + dy + 150);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHuman(ctx: CanvasRenderingContext2D, p: Pose) {
  // Torso
  ctx.fillStyle = WARDROBE.primary;
  ctx.beginPath();
  ctx.moveTo(p.leftShoulder.x - 30, ctx.canvas.height);
  ctx.lineTo(p.leftShoulder.x - 10, p.leftShoulder.y + 40);
  ctx.quadraticCurveTo(p.leftShoulder.x, p.leftShoulder.y, p.neck.x - 20, p.neck.y + 20);
  ctx.lineTo(p.neck.x + 20, p.neck.y + 20);
  ctx.quadraticCurveTo(p.rightShoulder.x, p.rightShoulder.y, p.rightShoulder.x + 10, p.rightShoulder.y + 40);
  ctx.lineTo(p.rightShoulder.x + 30, ctx.canvas.height);
  ctx.closePath();
  ctx.fill();

  // Neck shadow + neck
  ctx.fillStyle = SKIN_ACCENT;
  ctx.beginPath();
  ctx.moveTo(p.neck.x - 18, p.neck.y);
  ctx.quadraticCurveTo(p.neck.x, p.neck.y + 15, p.neck.x + 18, p.neck.y);
  ctx.lineTo(p.neck.x + 15, p.neck.y + 35);
  ctx.quadraticCurveTo(p.neck.x, p.neck.y + 45, p.neck.x - 15, p.neck.y + 35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.moveTo(p.neck.x - 16, p.neck.y - 10);
  ctx.lineTo(p.neck.x - 16, p.neck.y + 25);
  ctx.quadraticCurveTo(p.neck.x, p.neck.y + 32, p.neck.x + 16, p.neck.y + 25);
  ctx.lineTo(p.neck.x + 16, p.neck.y - 10);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(244,63,94,0.12)';
  ctx.beginPath();
  ctx.arc(p.head.x - 25, p.head.y + 12, 10, 0, Math.PI * 2);
  ctx.arc(p.head.x + 25, p.head.y + 12, 10, 0, Math.PI * 2);
  ctx.fill();

  // Hair (contemporary)
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.arc(p.head.x, p.head.y - 18, 58, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(p.head.x, p.head.y - 56, 42, 24, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(p.head.x - 58, p.head.y - 15, 12, 35);
  ctx.fillRect(p.head.x + 46, p.head.y - 15, 12, 35);

  // Face
  ctx.save();
  ctx.translate(p.head.x, p.head.y);
  ctx.rotate(p.headTilt);
  const eyebrowY = -18 - p.eyebrowsHeight * 5;
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-30, eyebrowY); ctx.quadraticCurveTo(-18, eyebrowY - 3, -10, eyebrowY); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, eyebrowY); ctx.quadraticCurveTo(18, eyebrowY - 3, 30, eyebrowY); ctx.stroke();

  if (p.eyesClosed) {
    ctx.strokeStyle = '#111827';
    ctx.beginPath(); ctx.arc(-20, -5, 6, Math.PI, 0, true); ctx.stroke();
    ctx.beginPath(); ctx.arc(20, -5, 6, Math.PI, 0, true); ctx.stroke();
  } else {
    ctx.fillStyle = '#111827';
    ctx.beginPath(); ctx.arc(-20, -6, 5.5, 0, Math.PI * 2); ctx.arc(20, -6, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-22, -8, 1.8, 0, Math.PI * 2); ctx.arc(18, -8, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  ctx.strokeStyle = SKIN_ACCENT;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 8); ctx.lineTo(4, 8); ctx.stroke();

  const mW = p.mouthWidth;
  if (p.mouthScaleY <= 0.1) {
    ctx.beginPath();
    ctx.moveTo(-mW / 2, 22); ctx.quadraticCurveTo(0, 28, mW / 2, 22);
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.stroke();
  } else {
    ctx.fillStyle = '#f43f5e'; ctx.strokeStyle = '#9f1239'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-mW / 2, 20);
    ctx.quadraticCurveTo(0, 20 + p.mouthScaleY * 25, mW / 2, 20);
    ctx.quadraticCurveTo(0, 18, -mW / 2, 20);
    ctx.fill(); ctx.stroke();
    if (p.mouthScaleY > 0.3) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-mW / 3, 21, (mW * 2) / 3, 3);
    }
  }
  ctx.restore();

  // Collar + buttons
  ctx.strokeStyle = WARDROBE.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.neck.x - 24, p.neck.y + 24);
  ctx.lineTo(p.neck.x, p.neck.y + 60);
  ctx.lineTo(p.neck.x + 24, p.neck.y + 24);
  ctx.stroke();
  ctx.fillStyle = WARDROBE.shadow;
  ctx.beginPath();
  ctx.arc(p.neck.x, p.neck.y + 80, 4, 0, Math.PI * 2);
  ctx.arc(p.neck.x, p.neck.y + 120, 4, 0, Math.PI * 2);
  ctx.arc(p.neck.x, p.neck.y + 160, 4, 0, Math.PI * 2);
  ctx.fill();

  // Sleeves
  ctx.strokeStyle = WARDROBE.primary;
  ctx.lineWidth = 44;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(p.leftShoulder.x, p.leftShoulder.y);
  ctx.lineTo(p.leftElbow.x, p.leftElbow.y);
  ctx.lineTo(p.leftWrist.x, p.leftWrist.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.rightShoulder.x, p.rightShoulder.y);
  ctx.lineTo(p.rightElbow.x, p.rightElbow.y);
  ctx.lineTo(p.rightWrist.x, p.rightWrist.y);
  ctx.stroke();

  // Skin cuffs
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(p.leftWrist.x, p.leftWrist.y);
  ctx.lineTo(p.leftWrist.x - Math.cos(p.leftHandRotation) * 14, p.leftWrist.y - Math.sin(p.leftHandRotation) * 14);
  ctx.moveTo(p.rightWrist.x, p.rightWrist.y);
  ctx.lineTo(p.rightWrist.x - Math.cos(p.rightHandRotation) * 14, p.rightWrist.y - Math.sin(p.rightHandRotation) * 14);
  ctx.stroke();

  drawHand(ctx, p.leftWrist, p.leftFingersState, p.leftHandRotation, true);
  drawHand(ctx, p.rightWrist, p.rightFingersState, p.rightHandRotation, false);
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  wrist: Joint,
  state: FingerState,
  rotation: number,
  isLeft: boolean,
) {
  ctx.save();
  ctx.translate(wrist.x, wrist.y);
  ctx.rotate(rotation);
  ctx.scale(isLeft ? -1 : 1, 1);

  ctx.fillStyle = SKIN;
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = SKIN;
  ctx.lineCap = 'round';
  ctx.lineWidth = 5.2;

  if (state === 'open' || state === 'flat') {
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.quadraticCurveTo(24, 6, 26, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -12); ctx.lineTo(14, -40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(1, -44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-10, -39); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-24, -30); ctx.stroke();
  } else if (state === 'point') {
    ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(6, -45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(16, -6); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.arc(-2, -6, 5, 0, Math.PI * 2); ctx.arc(-8, -4, 4.5, 0, Math.PI * 2); ctx.arc(-13, -2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (state === 'fist') {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.arc(4, -6, 5, 0, Math.PI * 2); ctx.arc(-1, -6, 5, 0, Math.PI * 2);
    ctx.arc(-6, -5, 4.8, 0, Math.PI * 2); ctx.arc(-11, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (state === 'hook') {
    ctx.beginPath(); ctx.moveTo(4, -10); ctx.quadraticCurveTo(14, -28, 6, -30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -10); ctx.quadraticCurveTo(4, -26, -3, -28); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.arc(-8, -4, 4.5, 0, Math.PI * 2); ctx.arc(-13, -2, 4, 0, Math.PI * 2); ctx.fill();
  } else if (state === 'c-shape') {
    ctx.beginPath(); ctx.moveTo(10, -12); ctx.quadraticCurveTo(24, -28, 14, -38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2, -14); ctx.quadraticCurveTo(12, -30, 4, -40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -11); ctx.quadraticCurveTo(2, -26, -5, -36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 4); ctx.quadraticCurveTo(22, 14, 18, 22); ctx.stroke();
  } else if (state === 'peace') {
    ctx.beginPath(); ctx.moveTo(6, -12); ctx.lineTo(15, -42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(-7, -43); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.arc(-8, -4, 4.5, 0, Math.PI * 2); ctx.arc(-13, -2, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCaption(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  if (!text) return;
  ctx.save();
  const cardH = 46;
  const cardW = w - 80;
  const cardX = 40;
  const cardY = h - 70;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cardX + 12, cardY);
  ctx.lineTo(cardX + cardW - 12, cardY);
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + 12);
  ctx.lineTo(cardX + cardW, cardY + cardH - 12);
  ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - 12, cardY + cardH);
  ctx.lineTo(cardX + 12, cardY + cardH);
  ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - 12);
  ctx.lineTo(cardX, cardY + 12);
  ctx.quadraticCurveTo(cardX, cardY, cardX + 12, cardY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, cardY + cardH / 2);
  ctx.restore();
}
