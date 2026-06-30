// ─── 2D procedural sign-pose engine ──────────────────────────────────────────
// Ported from the SignSetu "sign-translation-bridge" studio avatar: a lightweight
// keyframe + cosine-easing system that drives an HTML5-canvas presenter, far
// cheaper than a 3D/GLB rig. Each gloss maps to 1–2 keyframe Poses; the renderer
// interpolates joint coordinates with easeInOutSine for organic motion.

export interface Joint {
  x: number;
  y: number;
  z?: number;
}

export type FingerState =
  | 'fist' | 'open' | 'point' | 'hook' | 'flat' | 'c-shape' | 'peace';

export interface Pose {
  head: Joint;
  headTilt: number;        // radians
  eyebrowsHeight: number;  // -1..1
  eyesClosed: boolean;
  mouthScaleY: number;     // 0..1
  mouthWidth: number;
  neck: Joint;
  chest: Joint;
  leftShoulder: Joint;
  rightShoulder: Joint;
  leftElbow: Joint;
  rightElbow: Joint;
  leftWrist: Joint;
  rightWrist: Joint;
  leftFingersState: FingerState;
  rightFingersState: FingerState;
  leftHandRotation: number;
  rightHandRotation: number;
}

// ─── Interpolation ────────────────────────────────────────────────────────────
export function lerp(a: number, b: number, t: number): number {
  return (1 - t) * a + t * b;
}
export function lerpJoint(a: Joint, b: Joint, t: number): Joint {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z || 0, b.z || 0, t) };
}
/** Cosine easing — smooth, organic acceleration/deceleration. */
export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function interpolatePose(a: Pose, b: Pose, t: number): Pose {
  const e = easeInOutSine(t);
  return {
    head: lerpJoint(a.head, b.head, e),
    headTilt: lerp(a.headTilt, b.headTilt, e),
    eyebrowsHeight: lerp(a.eyebrowsHeight, b.eyebrowsHeight, e),
    eyesClosed: t < 0.08 || t > 0.92 ? b.eyesClosed : (t < 0.5 ? a.eyesClosed : b.eyesClosed),
    mouthScaleY: lerp(a.mouthScaleY, b.mouthScaleY, e),
    mouthWidth: lerp(a.mouthWidth, b.mouthWidth, e),
    neck: lerpJoint(a.neck, b.neck, e),
    chest: lerpJoint(a.chest, b.chest, e),
    leftShoulder: lerpJoint(a.leftShoulder, b.leftShoulder, e),
    rightShoulder: lerpJoint(a.rightShoulder, b.rightShoulder, e),
    leftElbow: lerpJoint(a.leftElbow, b.leftElbow, e),
    rightElbow: lerpJoint(a.rightElbow, b.rightElbow, e),
    leftWrist: lerpJoint(a.leftWrist, b.leftWrist, e),
    rightWrist: lerpJoint(a.rightWrist, b.rightWrist, e),
    leftFingersState: t < 0.5 ? a.leftFingersState : b.leftFingersState,
    rightFingersState: t < 0.5 ? a.rightFingersState : b.rightFingersState,
    leftHandRotation: lerp(a.leftHandRotation, b.leftHandRotation, e),
    rightHandRotation: lerp(a.rightHandRotation, b.rightHandRotation, e),
  };
}

// ─── REST (relaxed neutral) ───────────────────────────────────────────────────
export const REST_POSE: Pose = {
  head: { x: 300, y: 250 },
  headTilt: 0,
  eyebrowsHeight: 0,
  eyesClosed: false,
  mouthScaleY: 0.15,
  mouthWidth: 26,
  neck: { x: 300, y: 340 },
  chest: { x: 300, y: 440 },
  leftShoulder: { x: 200, y: 380 },
  rightShoulder: { x: 400, y: 380 },
  leftElbow: { x: 160, y: 520 },
  rightElbow: { x: 440, y: 520 },
  leftWrist: { x: 210, y: 580 },
  rightWrist: { x: 390, y: 580 },
  leftFingersState: 'open',
  rightFingersState: 'open',
  leftHandRotation: 0,
  rightHandRotation: 0,
};

// ─── Gesture keyframes ────────────────────────────────────────────────────────
export const GESTURE_KEYFRAMES: Record<string, Pose[]> = {
  REST: [REST_POSE],

  HELLO: [
    { ...REST_POSE, headTilt: -0.05, eyebrowsHeight: 0.6, mouthScaleY: 0.4, mouthWidth: 32,
      rightElbow: { x: 450, y: 320 }, rightWrist: { x: 360, y: 210 }, rightFingersState: 'flat', rightHandRotation: -0.3 },
    { ...REST_POSE, headTilt: 0.05, eyebrowsHeight: 0.8, mouthScaleY: 0.5, mouthWidth: 35,
      rightElbow: { x: 470, y: 340 }, rightWrist: { x: 410, y: 220 }, rightFingersState: 'flat', rightHandRotation: -0.15 },
  ],
  WELCOME: [
    { ...REST_POSE, headTilt: 0.04, eyebrowsHeight: 0.4, mouthScaleY: 0.45, mouthWidth: 33,
      rightElbow: { x: 460, y: 440 }, rightWrist: { x: 460, y: 360 }, rightFingersState: 'open', rightHandRotation: -0.4 },
    { ...REST_POSE, headTilt: -0.02, eyebrowsHeight: 0.5, mouthScaleY: 0.5, mouthWidth: 34,
      rightElbow: { x: 420, y: 460 }, rightWrist: { x: 310, y: 410 }, rightFingersState: 'flat', rightHandRotation: -0.8 },
  ],
  THANK_YOU: [
    { ...REST_POSE, headTilt: 0.05, eyebrowsHeight: 0.4, mouthScaleY: 0.2, mouthWidth: 26,
      rightElbow: { x: 420, y: 410 }, rightWrist: { x: 320, y: 290 }, rightFingersState: 'flat', rightHandRotation: -1.0 },
    { ...REST_POSE, headTilt: -0.02, eyebrowsHeight: 0.6, mouthScaleY: 0.55, mouthWidth: 35,
      rightElbow: { x: 440, y: 440 }, rightWrist: { x: 340, y: 420 }, rightFingersState: 'flat', rightHandRotation: -0.2 },
  ],
  GOOD: [
    { ...REST_POSE, eyebrowsHeight: 0.5,
      leftElbow: { x: 180, y: 450 }, leftWrist: { x: 240, y: 480 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 410, y: 390 }, rightWrist: { x: 310, y: 280 }, rightFingersState: 'flat', rightHandRotation: -0.8 },
    { ...REST_POSE, eyebrowsHeight: 0.6, mouthScaleY: 0.4, mouthWidth: 32,
      leftElbow: { x: 180, y: 450 }, leftWrist: { x: 240, y: 480 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 320, y: 440 }, rightWrist: { x: 250, y: 450 }, rightFingersState: 'flat', rightHandRotation: 1.5 },
  ],
  MORNING: [
    { ...REST_POSE,
      leftElbow: { x: 170, y: 450 }, leftWrist: { x: 270, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 470 }, rightWrist: { x: 350, y: 460 }, rightFingersState: 'open' },
    { ...REST_POSE, eyebrowsHeight: 0.6, mouthScaleY: 0.45,
      leftElbow: { x: 170, y: 450 }, leftWrist: { x: 270, y: 450 }, leftFingersState: 'flat',
      rightElbow: { x: 450, y: 350 }, rightWrist: { x: 360, y: 220 }, rightFingersState: 'open' },
  ],
  LOVE: [
    { ...REST_POSE, headTilt: 0.05, eyebrowsHeight: 0.3, mouthScaleY: 0.35, mouthWidth: 30,
      leftElbow: { x: 230, y: 480 }, leftWrist: { x: 340, y: 390 }, leftFingersState: 'fist',
      rightElbow: { x: 370, y: 480 }, rightWrist: { x: 260, y: 390 }, rightFingersState: 'fist' },
  ],
  PEACE: [
    { ...REST_POSE,
      leftElbow: { x: 220, y: 460 }, leftWrist: { x: 280, y: 420 }, leftFingersState: 'flat',
      rightElbow: { x: 380, y: 460 }, rightWrist: { x: 320, y: 420 }, rightFingersState: 'flat' },
    { ...REST_POSE, eyebrowsHeight: 0.4, mouthScaleY: 0.25, mouthWidth: 28,
      leftElbow: { x: 160, y: 500 }, leftWrist: { x: 220, y: 500 }, leftFingersState: 'flat', leftHandRotation: -0.4,
      rightElbow: { x: 440, y: 500 }, rightWrist: { x: 380, y: 500 }, rightFingersState: 'flat', rightHandRotation: 0.4 },
  ],
  FRIEND: [
    { ...REST_POSE, eyebrowsHeight: 0.5, mouthScaleY: 0.4,
      leftElbow: { x: 230, y: 450 }, leftWrist: { x: 285, y: 400 }, leftFingersState: 'hook',
      rightElbow: { x: 370, y: 450 }, rightWrist: { x: 315, y: 400 }, rightFingersState: 'hook' },
    { ...REST_POSE, eyebrowsHeight: 0.6, mouthScaleY: 0.45, mouthWidth: 32,
      leftElbow: { x: 230, y: 450 }, leftWrist: { x: 310, y: 410 }, leftFingersState: 'hook',
      rightElbow: { x: 370, y: 450 }, rightWrist: { x: 290, y: 395 }, rightFingersState: 'hook' },
  ],
  ME: [
    { ...REST_POSE, headTilt: 0.02,
      rightElbow: { x: 420, y: 450 }, rightWrist: { x: 310, y: 430 }, rightFingersState: 'point', rightHandRotation: -1.4 },
  ],
  YOU: [
    { ...REST_POSE, headTilt: -0.04, eyebrowsHeight: 0.35,
      rightElbow: { x: 450, y: 430 }, rightWrist: { x: 340, y: 360 }, rightFingersState: 'point', rightHandRotation: -0.1 },
  ],
  HAPPINESS: [
    { ...REST_POSE, eyebrowsHeight: 0.7, mouthScaleY: 0.6, mouthWidth: 36,
      leftElbow: { x: 210, y: 460 }, leftWrist: { x: 260, y: 410 }, leftFingersState: 'open',
      rightElbow: { x: 390, y: 460 }, rightWrist: { x: 340, y: 400 }, rightFingersState: 'open' },
    { ...REST_POSE, eyebrowsHeight: 0.75, mouthScaleY: 0.65, mouthWidth: 38,
      leftElbow: { x: 220, y: 450 }, leftWrist: { x: 250, y: 390 }, leftFingersState: 'open',
      rightElbow: { x: 380, y: 450 }, rightWrist: { x: 350, y: 380 }, rightFingersState: 'open' },
  ],
  PRESENT: [
    { ...REST_POSE,
      leftElbow: { x: 180, y: 460 }, leftWrist: { x: 240, y: 460 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 420, y: 460 }, rightWrist: { x: 360, y: 460 }, rightFingersState: 'flat', rightHandRotation: -1.5 },
    { ...REST_POSE, eyebrowsHeight: 0.55, mouthScaleY: 0.45, mouthWidth: 33,
      leftElbow: { x: 170, y: 440 }, leftWrist: { x: 210, y: 440 }, leftFingersState: 'open', leftHandRotation: 1.2,
      rightElbow: { x: 430, y: 440 }, rightWrist: { x: 390, y: 440 }, rightFingersState: 'open', rightHandRotation: -1.2 },
  ],

  // ── Added common SignSetu vocabulary ────────────────────────────────────────
  BYE: [
    { ...REST_POSE, eyebrowsHeight: 0.5, mouthScaleY: 0.4, mouthWidth: 32,
      rightElbow: { x: 460, y: 330 }, rightWrist: { x: 410, y: 230 }, rightFingersState: 'open', rightHandRotation: -0.2 },
    { ...REST_POSE, eyebrowsHeight: 0.5, mouthScaleY: 0.4, mouthWidth: 32,
      rightElbow: { x: 460, y: 330 }, rightWrist: { x: 360, y: 235 }, rightFingersState: 'flat', rightHandRotation: -0.4 },
  ],
  YES: [
    { ...REST_POSE, eyebrowsHeight: 0.4,
      rightElbow: { x: 440, y: 430 }, rightWrist: { x: 360, y: 320 }, rightFingersState: 'fist', rightHandRotation: -0.5 },
    { ...REST_POSE, headTilt: 0.06, eyebrowsHeight: 0.45,
      rightElbow: { x: 440, y: 440 }, rightWrist: { x: 360, y: 350 }, rightFingersState: 'fist', rightHandRotation: -0.1 },
  ],
  NO: [
    { ...REST_POSE,
      rightElbow: { x: 440, y: 420 }, rightWrist: { x: 360, y: 320 }, rightFingersState: 'peace', rightHandRotation: -0.4 },
    { ...REST_POSE,
      rightElbow: { x: 420, y: 420 }, rightWrist: { x: 360, y: 320 }, rightFingersState: 'fist', rightHandRotation: -0.4 },
  ],
  PLEASE: [
    { ...REST_POSE, eyebrowsHeight: 0.4, mouthScaleY: 0.3,
      rightElbow: { x: 410, y: 430 }, rightWrist: { x: 320, y: 400 }, rightFingersState: 'flat', rightHandRotation: -0.6 },
    { ...REST_POSE, eyebrowsHeight: 0.5, mouthScaleY: 0.35,
      rightElbow: { x: 405, y: 430 }, rightWrist: { x: 315, y: 380 }, rightFingersState: 'flat', rightHandRotation: -0.5 },
  ],
  SORRY: [
    { ...REST_POSE, eyebrowsHeight: -0.2, mouthScaleY: 0.2,
      rightElbow: { x: 410, y: 430 }, rightWrist: { x: 320, y: 400 }, rightFingersState: 'fist', rightHandRotation: -0.6 },
    { ...REST_POSE, eyebrowsHeight: -0.1, mouthScaleY: 0.2,
      rightElbow: { x: 415, y: 430 }, rightWrist: { x: 330, y: 410 }, rightFingersState: 'fist', rightHandRotation: -0.4 },
  ],
  NAME: [
    { ...REST_POSE,
      leftElbow: { x: 230, y: 450 }, leftWrist: { x: 300, y: 410 }, leftFingersState: 'peace', leftHandRotation: -0.2,
      rightElbow: { x: 370, y: 450 }, rightWrist: { x: 320, y: 420 }, rightFingersState: 'peace', rightHandRotation: 0.2 },
    { ...REST_POSE,
      leftElbow: { x: 230, y: 450 }, leftWrist: { x: 305, y: 420 }, leftFingersState: 'peace', leftHandRotation: -0.1,
      rightElbow: { x: 370, y: 450 }, rightWrist: { x: 315, y: 405 }, rightFingersState: 'peace', rightHandRotation: 0.1 },
  ],
  WHAT: [
    { ...REST_POSE, headTilt: -0.06, eyebrowsHeight: -0.3, mouthScaleY: 0.2,
      leftElbow: { x: 175, y: 470 }, leftWrist: { x: 235, y: 470 }, leftFingersState: 'open', leftHandRotation: 1.4,
      rightElbow: { x: 445, y: 470 }, rightWrist: { x: 385, y: 470 }, rightFingersState: 'open', rightHandRotation: -1.4 },
    { ...REST_POSE, headTilt: 0.04, eyebrowsHeight: -0.4, mouthScaleY: 0.25,
      leftElbow: { x: 165, y: 480 }, leftWrist: { x: 225, y: 485 }, leftFingersState: 'open', leftHandRotation: 1.5,
      rightElbow: { x: 455, y: 480 }, rightWrist: { x: 395, y: 485 }, rightFingersState: 'open', rightHandRotation: -1.5 },
  ],
  HELP: [
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 270, y: 460 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 440 }, rightWrist: { x: 300, y: 430 }, rightFingersState: 'fist', rightHandRotation: 0 },
    { ...REST_POSE, eyebrowsHeight: 0.4,
      leftElbow: { x: 200, y: 450 }, leftWrist: { x: 280, y: 410 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 410 }, rightWrist: { x: 305, y: 380 }, rightFingersState: 'fist', rightHandRotation: 0 },
  ],
  WANT: [
    { ...REST_POSE, eyebrowsHeight: 0.2,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 250, y: 410 }, leftFingersState: 'c-shape', leftHandRotation: 1.2,
      rightElbow: { x: 400, y: 470 }, rightWrist: { x: 350, y: 410 }, rightFingersState: 'c-shape', rightHandRotation: -1.2 },
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 210, y: 470 }, leftWrist: { x: 265, y: 440 }, leftFingersState: 'c-shape', leftHandRotation: 1.1,
      rightElbow: { x: 390, y: 470 }, rightWrist: { x: 335, y: 440 }, rightFingersState: 'c-shape', rightHandRotation: -1.1 },
  ],
  EAT: [
    { ...REST_POSE,
      rightElbow: { x: 410, y: 400 }, rightWrist: { x: 320, y: 290 }, rightFingersState: 'flat', rightHandRotation: -1.1 },
    { ...REST_POSE, mouthScaleY: 0.3,
      rightElbow: { x: 415, y: 410 }, rightWrist: { x: 315, y: 305 }, rightFingersState: 'flat', rightHandRotation: -1.0 },
  ],
  DRINK: [
    { ...REST_POSE,
      rightElbow: { x: 420, y: 420 }, rightWrist: { x: 330, y: 320 }, rightFingersState: 'c-shape', rightHandRotation: -0.8 },
    { ...REST_POSE, headTilt: -0.05,
      rightElbow: { x: 420, y: 410 }, rightWrist: { x: 325, y: 295 }, rightFingersState: 'c-shape', rightHandRotation: -1.1 },
  ],
  HOME: [
    { ...REST_POSE,
      rightElbow: { x: 420, y: 410 }, rightWrist: { x: 330, y: 300 }, rightFingersState: 'flat', rightHandRotation: -0.9 },
    { ...REST_POSE,
      rightElbow: { x: 430, y: 400 }, rightWrist: { x: 350, y: 280 }, rightFingersState: 'flat', rightHandRotation: -0.5 },
  ],
  WORK: [
    { ...REST_POSE,
      leftElbow: { x: 220, y: 470 }, leftWrist: { x: 290, y: 450 }, leftFingersState: 'fist', leftHandRotation: 0,
      rightElbow: { x: 360, y: 440 }, rightWrist: { x: 300, y: 420 }, rightFingersState: 'fist', rightHandRotation: 0 },
    { ...REST_POSE,
      leftElbow: { x: 220, y: 470 }, leftWrist: { x: 290, y: 455 }, leftFingersState: 'fist', leftHandRotation: 0,
      rightElbow: { x: 360, y: 460 }, rightWrist: { x: 300, y: 445 }, rightFingersState: 'fist', rightHandRotation: 0 },
  ],
  FAMILY: [
    { ...REST_POSE, eyebrowsHeight: 0.4, mouthScaleY: 0.35,
      leftElbow: { x: 220, y: 450 }, leftWrist: { x: 285, y: 410 }, leftFingersState: 'open', leftHandRotation: 0.3,
      rightElbow: { x: 380, y: 450 }, rightWrist: { x: 315, y: 410 }, rightFingersState: 'open', rightHandRotation: -0.3 },
    { ...REST_POSE, eyebrowsHeight: 0.45,
      leftElbow: { x: 200, y: 460 }, leftWrist: { x: 255, y: 440 }, leftFingersState: 'open', leftHandRotation: 0.6,
      rightElbow: { x: 400, y: 460 }, rightWrist: { x: 345, y: 440 }, rightFingersState: 'open', rightHandRotation: -0.6 },
  ],
  GO: [
    { ...REST_POSE,
      rightElbow: { x: 420, y: 450 }, rightWrist: { x: 350, y: 380 }, rightFingersState: 'point', rightHandRotation: -0.4 },
    { ...REST_POSE,
      rightElbow: { x: 455, y: 460 }, rightWrist: { x: 420, y: 410 }, rightFingersState: 'point', rightHandRotation: 0.1 },
  ],
  COME: [
    { ...REST_POSE,
      rightElbow: { x: 455, y: 460 }, rightWrist: { x: 420, y: 410 }, rightFingersState: 'point', rightHandRotation: 0.1 },
    { ...REST_POSE,
      rightElbow: { x: 420, y: 450 }, rightWrist: { x: 340, y: 390 }, rightFingersState: 'point', rightHandRotation: -0.6 },
  ],
  SEE: [
    { ...REST_POSE,
      rightElbow: { x: 430, y: 400 }, rightWrist: { x: 350, y: 300 }, rightFingersState: 'peace', rightHandRotation: -0.8 },
    { ...REST_POSE,
      rightElbow: { x: 445, y: 420 }, rightWrist: { x: 380, y: 350 }, rightFingersState: 'peace', rightHandRotation: -0.3 },
  ],
  UNDERSTAND: [
    { ...REST_POSE, eyebrowsHeight: 0.4,
      rightElbow: { x: 450, y: 360 }, rightWrist: { x: 370, y: 230 }, rightFingersState: 'fist', rightHandRotation: -0.3 },
    { ...REST_POSE, eyebrowsHeight: 0.5,
      rightElbow: { x: 450, y: 360 }, rightWrist: { x: 370, y: 225 }, rightFingersState: 'point', rightHandRotation: -0.3 },
  ],
  NAMASTE: [
    { ...REST_POSE, headTilt: 0.05, eyebrowsHeight: 0.3, mouthScaleY: 0.2,
      leftElbow: { x: 230, y: 470 }, leftWrist: { x: 290, y: 400 }, leftFingersState: 'flat', leftHandRotation: 1.2,
      rightElbow: { x: 370, y: 470 }, rightWrist: { x: 310, y: 400 }, rightFingersState: 'flat', rightHandRotation: -1.2 },
    { ...REST_POSE, headTilt: 0.12, eyebrowsHeight: 0.3, mouthScaleY: 0.18,
      leftElbow: { x: 235, y: 470 }, leftWrist: { x: 293, y: 395 }, leftFingersState: 'flat', leftHandRotation: 1.25,
      rightElbow: { x: 365, y: 470 }, rightWrist: { x: 307, y: 395 }, rightFingersState: 'flat', rightHandRotation: -1.25 },
  ],

  // ── Expanded vocabulary (batch 2) ───────────────────────────────────────────
  WE: [
    { ...REST_POSE, eyebrowsHeight: 0.3,
      rightElbow: { x: 410, y: 430 }, rightWrist: { x: 260, y: 410 }, rightFingersState: 'point', rightHandRotation: -1.4 },
    { ...REST_POSE, eyebrowsHeight: 0.3,
      rightElbow: { x: 430, y: 430 }, rightWrist: { x: 340, y: 410 }, rightFingersState: 'point', rightHandRotation: -1.0 },
  ],
  THEY: [
    { ...REST_POSE,
      rightElbow: { x: 450, y: 440 }, rightWrist: { x: 380, y: 380 }, rightFingersState: 'point', rightHandRotation: 0.2 },
    { ...REST_POSE,
      rightElbow: { x: 460, y: 440 }, rightWrist: { x: 430, y: 390 }, rightFingersState: 'point', rightHandRotation: 0.5 },
  ],
  HE: [
    { ...REST_POSE,
      rightElbow: { x: 450, y: 430 }, rightWrist: { x: 400, y: 360 }, rightFingersState: 'point', rightHandRotation: 0.1 },
  ],
  SHE: [
    { ...REST_POSE,
      rightElbow: { x: 440, y: 430 }, rightWrist: { x: 370, y: 370 }, rightFingersState: 'point', rightHandRotation: -0.1 },
  ],
  NICE: [
    { ...REST_POSE, eyebrowsHeight: 0.4, mouthScaleY: 0.4,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 440 }, rightWrist: { x: 250, y: 440 }, rightFingersState: 'flat', rightHandRotation: 1.5 },
    { ...REST_POSE, eyebrowsHeight: 0.5, mouthScaleY: 0.45,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 420, y: 440 }, rightWrist: { x: 330, y: 445 }, rightFingersState: 'flat', rightHandRotation: 1.5 },
  ],
  FINE: [
    { ...REST_POSE, eyebrowsHeight: 0.5, mouthScaleY: 0.4,
      rightElbow: { x: 400, y: 460 }, rightWrist: { x: 320, y: 440 }, rightFingersState: 'open', rightHandRotation: -1.5 },
    { ...REST_POSE, eyebrowsHeight: 0.55, mouthScaleY: 0.45,
      rightElbow: { x: 410, y: 440 }, rightWrist: { x: 330, y: 410 }, rightFingersState: 'open', rightHandRotation: -1.3 },
  ],
  MEET: [
    { ...REST_POSE, eyebrowsHeight: 0.4,
      leftElbow: { x: 230, y: 460 }, leftWrist: { x: 280, y: 400 }, leftFingersState: 'point', leftHandRotation: 0,
      rightElbow: { x: 370, y: 460 }, rightWrist: { x: 320, y: 400 }, rightFingersState: 'point', rightHandRotation: 0 },
    { ...REST_POSE, eyebrowsHeight: 0.45,
      leftElbow: { x: 250, y: 460 }, leftWrist: { x: 295, y: 405 }, leftFingersState: 'point', leftHandRotation: 0,
      rightElbow: { x: 350, y: 460 }, rightWrist: { x: 305, y: 405 }, rightFingersState: 'point', rightHandRotation: 0 },
  ],
  LEARN: [
    { ...REST_POSE,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 270, y: 460 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 460 }, rightWrist: { x: 290, y: 450 }, rightFingersState: 'open', rightHandRotation: -0.8 },
    { ...REST_POSE, eyebrowsHeight: 0.4,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 270, y: 460 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 420, y: 360 }, rightWrist: { x: 350, y: 240 }, rightFingersState: 'fist', rightHandRotation: -0.4 },
  ],
  READ: [
    { ...REST_POSE,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 430 }, rightWrist: { x: 270, y: 410 }, rightFingersState: 'peace', rightHandRotation: -1.4 },
    { ...REST_POSE,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 400, y: 440 }, rightWrist: { x: 320, y: 440 }, rightFingersState: 'peace', rightHandRotation: -1.4 },
  ],
  WRITE: [
    { ...REST_POSE,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 440 }, rightWrist: { x: 270, y: 440 }, rightFingersState: 'point', rightHandRotation: -1.0 },
    { ...REST_POSE,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 400, y: 445 }, rightWrist: { x: 320, y: 445 }, rightFingersState: 'point', rightHandRotation: -1.0 },
  ],
  THINK: [
    { ...REST_POSE, eyebrowsHeight: 0.3,
      rightElbow: { x: 430, y: 360 }, rightWrist: { x: 340, y: 245 }, rightFingersState: 'point', rightHandRotation: -0.4 },
  ],
  REMEMBER: [
    { ...REST_POSE,
      rightElbow: { x: 440, y: 360 }, rightWrist: { x: 360, y: 235 }, rightFingersState: 'fist', rightHandRotation: -0.3 },
    { ...REST_POSE,
      rightElbow: { x: 430, y: 400 }, rightWrist: { x: 330, y: 320 }, rightFingersState: 'fist', rightHandRotation: -0.5 },
  ],
  FORGET: [
    { ...REST_POSE, eyebrowsHeight: -0.1,
      rightElbow: { x: 420, y: 380 }, rightWrist: { x: 300, y: 250 }, rightFingersState: 'open', rightHandRotation: -1.4 },
    { ...REST_POSE, eyebrowsHeight: -0.1,
      rightElbow: { x: 450, y: 380 }, rightWrist: { x: 380, y: 250 }, rightFingersState: 'fist', rightHandRotation: -0.8 },
  ],
  FEEL: [
    { ...REST_POSE, eyebrowsHeight: 0.3,
      rightElbow: { x: 400, y: 450 }, rightWrist: { x: 320, y: 420 }, rightFingersState: 'open', rightHandRotation: -1.5 },
    { ...REST_POSE, eyebrowsHeight: 0.4,
      rightElbow: { x: 400, y: 420 }, rightWrist: { x: 320, y: 360 }, rightFingersState: 'open', rightHandRotation: -1.5 },
  ],
  WAIT: [
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 220, y: 480 }, leftWrist: { x: 280, y: 440 }, leftFingersState: 'open', leftHandRotation: 1.2,
      rightElbow: { x: 380, y: 480 }, rightWrist: { x: 320, y: 430 }, rightFingersState: 'open', rightHandRotation: -1.2 },
    { ...REST_POSE, eyebrowsHeight: 0.35,
      leftElbow: { x: 220, y: 480 }, leftWrist: { x: 280, y: 425 }, leftFingersState: 'open', leftHandRotation: 1.2,
      rightElbow: { x: 380, y: 480 }, rightWrist: { x: 320, y: 415 }, rightFingersState: 'open', rightHandRotation: -1.2 },
  ],
  STOP: [
    { ...REST_POSE,
      leftElbow: { x: 210, y: 470 }, leftWrist: { x: 290, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 400 }, rightWrist: { x: 300, y: 360 }, rightFingersState: 'flat', rightHandRotation: -0.2 },
    { ...REST_POSE,
      leftElbow: { x: 210, y: 470 }, leftWrist: { x: 290, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 450 }, rightWrist: { x: 290, y: 440 }, rightFingersState: 'flat', rightHandRotation: -0.2 },
  ],
  GIVE: [
    { ...REST_POSE,
      rightElbow: { x: 410, y: 460 }, rightWrist: { x: 330, y: 430 }, rightFingersState: 'flat', rightHandRotation: -1.2 },
    { ...REST_POSE, eyebrowsHeight: 0.3,
      rightElbow: { x: 450, y: 440 }, rightWrist: { x: 390, y: 380 }, rightFingersState: 'open', rightHandRotation: -0.8 },
  ],
  TAKE: [
    { ...REST_POSE,
      rightElbow: { x: 450, y: 440 }, rightWrist: { x: 390, y: 380 }, rightFingersState: 'open', rightHandRotation: -0.8 },
    { ...REST_POSE,
      rightElbow: { x: 410, y: 450 }, rightWrist: { x: 330, y: 420 }, rightFingersState: 'fist', rightHandRotation: -1.0 },
  ],
  FINISH: [
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 220, y: 470 }, leftWrist: { x: 280, y: 430 }, leftFingersState: 'open', leftHandRotation: -1.5,
      rightElbow: { x: 380, y: 470 }, rightWrist: { x: 320, y: 430 }, rightFingersState: 'open', rightHandRotation: 1.5 },
    { ...REST_POSE, eyebrowsHeight: 0.35,
      leftElbow: { x: 220, y: 470 }, leftWrist: { x: 280, y: 430 }, leftFingersState: 'open', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 470 }, rightWrist: { x: 320, y: 430 }, rightFingersState: 'open', rightHandRotation: -1.5 },
  ],
  START: [
    { ...REST_POSE,
      leftElbow: { x: 230, y: 470 }, leftWrist: { x: 290, y: 430 }, leftFingersState: 'open', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 450 }, rightWrist: { x: 300, y: 420 }, rightFingersState: 'point', rightHandRotation: 0 },
    { ...REST_POSE,
      leftElbow: { x: 230, y: 470 }, leftWrist: { x: 290, y: 430 }, leftFingersState: 'open', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 450 }, rightWrist: { x: 320, y: 415 }, rightFingersState: 'point', rightHandRotation: 0.4 },
  ],
  CALL: [
    { ...REST_POSE,
      rightElbow: { x: 420, y: 420 }, rightWrist: { x: 330, y: 310 }, rightFingersState: 'open', rightHandRotation: -0.6 },
    { ...REST_POSE, headTilt: -0.05,
      rightElbow: { x: 440, y: 380 }, rightWrist: { x: 360, y: 260 }, rightFingersState: 'open', rightHandRotation: -0.3 },
  ],
  TALK: [
    { ...REST_POSE, mouthScaleY: 0.4, mouthWidth: 32,
      rightElbow: { x: 410, y: 400 }, rightWrist: { x: 320, y: 290 }, rightFingersState: 'flat', rightHandRotation: -1.4 },
    { ...REST_POSE, mouthScaleY: 0.45, mouthWidth: 33,
      rightElbow: { x: 430, y: 410 }, rightWrist: { x: 350, y: 300 }, rightFingersState: 'flat', rightHandRotation: -1.0 },
  ],
  LISTEN: [
    { ...REST_POSE, headTilt: -0.06, eyebrowsHeight: 0.3,
      rightElbow: { x: 440, y: 380 }, rightWrist: { x: 360, y: 260 }, rightFingersState: 'c-shape', rightHandRotation: -0.2 },
  ],
  SLEEP: [
    { ...REST_POSE, headTilt: 0.12, eyesClosed: true, mouthScaleY: 0.1,
      rightElbow: { x: 420, y: 380 }, rightWrist: { x: 320, y: 270 }, rightFingersState: 'open', rightHandRotation: -1.5 },
    { ...REST_POSE, headTilt: 0.16, eyesClosed: true, mouthScaleY: 0.1,
      rightElbow: { x: 420, y: 380 }, rightWrist: { x: 320, y: 290 }, rightFingersState: 'flat', rightHandRotation: -1.5 },
  ],
  PLAY: [
    { ...REST_POSE, eyebrowsHeight: 0.5, mouthScaleY: 0.45,
      leftElbow: { x: 210, y: 470 }, leftWrist: { x: 270, y: 430 }, leftFingersState: 'open', leftHandRotation: -0.6,
      rightElbow: { x: 390, y: 470 }, rightWrist: { x: 330, y: 430 }, rightFingersState: 'open', rightHandRotation: 0.6 },
    { ...REST_POSE, eyebrowsHeight: 0.55, mouthScaleY: 0.5,
      leftElbow: { x: 210, y: 470 }, leftWrist: { x: 270, y: 430 }, leftFingersState: 'open', leftHandRotation: 0.6,
      rightElbow: { x: 390, y: 470 }, rightWrist: { x: 330, y: 430 }, rightFingersState: 'open', rightHandRotation: -0.6 },
  ],
  MOTHER: [
    { ...REST_POSE, eyebrowsHeight: 0.3,
      rightElbow: { x: 410, y: 400 }, rightWrist: { x: 320, y: 300 }, rightFingersState: 'open', rightHandRotation: -1.3 },
    { ...REST_POSE, eyebrowsHeight: 0.35,
      rightElbow: { x: 415, y: 400 }, rightWrist: { x: 325, y: 310 }, rightFingersState: 'open', rightHandRotation: -1.3 },
  ],
  FATHER: [
    { ...REST_POSE, eyebrowsHeight: 0.3,
      rightElbow: { x: 430, y: 360 }, rightWrist: { x: 350, y: 240 }, rightFingersState: 'open', rightHandRotation: -1.3 },
    { ...REST_POSE, eyebrowsHeight: 0.35,
      rightElbow: { x: 435, y: 360 }, rightWrist: { x: 355, y: 250 }, rightFingersState: 'open', rightHandRotation: -1.3 },
  ],
  BABY: [
    { ...REST_POSE, headTilt: 0.08, eyebrowsHeight: 0.4, mouthScaleY: 0.35,
      leftElbow: { x: 230, y: 490 }, leftWrist: { x: 330, y: 450 }, leftFingersState: 'flat', leftHandRotation: 0.1,
      rightElbow: { x: 370, y: 490 }, rightWrist: { x: 270, y: 450 }, rightFingersState: 'flat', rightHandRotation: -0.1 },
    { ...REST_POSE, headTilt: -0.05, eyebrowsHeight: 0.45, mouthScaleY: 0.4,
      leftElbow: { x: 250, y: 490 }, leftWrist: { x: 350, y: 460 }, leftFingersState: 'flat', leftHandRotation: 0.1,
      rightElbow: { x: 390, y: 490 }, rightWrist: { x: 290, y: 460 }, rightFingersState: 'flat', rightHandRotation: -0.1 },
  ],
  BIG: [
    { ...REST_POSE, eyebrowsHeight: 0.5, mouthScaleY: 0.3,
      leftElbow: { x: 250, y: 470 }, leftWrist: { x: 300, y: 430 }, leftFingersState: 'point', leftHandRotation: 0.8,
      rightElbow: { x: 350, y: 470 }, rightWrist: { x: 300, y: 430 }, rightFingersState: 'point', rightHandRotation: -0.8 },
    { ...REST_POSE, eyebrowsHeight: 0.6, mouthScaleY: 0.4,
      leftElbow: { x: 160, y: 500 }, leftWrist: { x: 210, y: 460 }, leftFingersState: 'point', leftHandRotation: 0.8,
      rightElbow: { x: 440, y: 500 }, rightWrist: { x: 390, y: 460 }, rightFingersState: 'point', rightHandRotation: -0.8 },
  ],
  SMALL: [
    { ...REST_POSE,
      leftElbow: { x: 200, y: 490 }, leftWrist: { x: 270, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 400, y: 490 }, rightWrist: { x: 330, y: 450 }, rightFingersState: 'flat', rightHandRotation: -1.5 },
    { ...REST_POSE, eyebrowsHeight: -0.1,
      leftElbow: { x: 250, y: 490 }, leftWrist: { x: 290, y: 455 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 350, y: 490 }, rightWrist: { x: 310, y: 455 }, rightFingersState: 'flat', rightHandRotation: -1.5 },
  ],
  HOT: [
    { ...REST_POSE, mouthScaleY: 0.3,
      rightElbow: { x: 410, y: 400 }, rightWrist: { x: 320, y: 290 }, rightFingersState: 'hook', rightHandRotation: -1.2 },
    { ...REST_POSE, mouthScaleY: 0.35,
      rightElbow: { x: 440, y: 410 }, rightWrist: { x: 370, y: 320 }, rightFingersState: 'c-shape', rightHandRotation: -0.6 },
  ],
  COLD: [
    { ...REST_POSE, eyebrowsHeight: -0.2,
      leftElbow: { x: 220, y: 470 }, leftWrist: { x: 280, y: 420 }, leftFingersState: 'fist', leftHandRotation: 0.3,
      rightElbow: { x: 380, y: 470 }, rightWrist: { x: 320, y: 420 }, rightFingersState: 'fist', rightHandRotation: -0.3 },
    { ...REST_POSE, eyebrowsHeight: -0.25, headTilt: 0.04,
      leftElbow: { x: 230, y: 470 }, leftWrist: { x: 290, y: 425 }, leftFingersState: 'fist', leftHandRotation: -0.3,
      rightElbow: { x: 370, y: 470 }, rightWrist: { x: 310, y: 425 }, rightFingersState: 'fist', rightHandRotation: 0.3 },
  ],
  NEW: [
    { ...REST_POSE,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 460 }, rightWrist: { x: 320, y: 460 }, rightFingersState: 'flat', rightHandRotation: -1.0 },
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 430 }, rightWrist: { x: 250, y: 430 }, rightFingersState: 'flat', rightHandRotation: -0.8 },
  ],
  OLD: [
    { ...REST_POSE,
      rightElbow: { x: 410, y: 400 }, rightWrist: { x: 320, y: 300 }, rightFingersState: 'fist', rightHandRotation: -0.8 },
    { ...REST_POSE,
      rightElbow: { x: 410, y: 460 }, rightWrist: { x: 320, y: 420 }, rightFingersState: 'fist', rightHandRotation: -0.8 },
  ],
  BEAUTIFUL: [
    { ...REST_POSE, eyebrowsHeight: 0.5, mouthScaleY: 0.45, mouthWidth: 34,
      rightElbow: { x: 430, y: 380 }, rightWrist: { x: 340, y: 250 }, rightFingersState: 'open', rightHandRotation: -0.4 },
    { ...REST_POSE, eyebrowsHeight: 0.6, mouthScaleY: 0.5, mouthWidth: 35,
      rightElbow: { x: 430, y: 400 }, rightWrist: { x: 360, y: 320 }, rightFingersState: 'fist', rightHandRotation: -0.4 },
  ],
  BAD: [
    { ...REST_POSE, eyebrowsHeight: -0.2, mouthScaleY: 0.2,
      rightElbow: { x: 410, y: 380 }, rightWrist: { x: 320, y: 280 }, rightFingersState: 'flat', rightHandRotation: -1.4 },
    { ...REST_POSE, eyebrowsHeight: -0.3,
      rightElbow: { x: 430, y: 460 }, rightWrist: { x: 360, y: 430 }, rightFingersState: 'flat', rightHandRotation: 1.4 },
  ],
  RIGHT: [
    { ...REST_POSE,
      leftElbow: { x: 230, y: 470 }, leftWrist: { x: 290, y: 430 }, leftFingersState: 'point', leftHandRotation: 0,
      rightElbow: { x: 370, y: 440 }, rightWrist: { x: 310, y: 405 }, rightFingersState: 'point', rightHandRotation: 0 },
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 230, y: 470 }, leftWrist: { x: 290, y: 430 }, leftFingersState: 'point', leftHandRotation: 0,
      rightElbow: { x: 370, y: 455 }, rightWrist: { x: 310, y: 425 }, rightFingersState: 'point', rightHandRotation: 0 },
  ],
  WRONG: [
    { ...REST_POSE, eyebrowsHeight: -0.2,
      rightElbow: { x: 420, y: 400 }, rightWrist: { x: 330, y: 290 }, rightFingersState: 'open', rightHandRotation: -0.8 },
  ],
  SAME: [
    { ...REST_POSE,
      leftElbow: { x: 230, y: 470 }, leftWrist: { x: 290, y: 430 }, leftFingersState: 'point', leftHandRotation: -1.4,
      rightElbow: { x: 370, y: 470 }, rightWrist: { x: 310, y: 430 }, rightFingersState: 'point', rightHandRotation: -1.4 },
    { ...REST_POSE,
      leftElbow: { x: 245, y: 470 }, leftWrist: { x: 300, y: 432 }, leftFingersState: 'point', leftHandRotation: -1.4,
      rightElbow: { x: 355, y: 470 }, rightWrist: { x: 300, y: 432 }, rightFingersState: 'point', rightHandRotation: -1.4 },
  ],
  DIFFERENT: [
    { ...REST_POSE,
      leftElbow: { x: 250, y: 460 }, leftWrist: { x: 300, y: 420 }, leftFingersState: 'point', leftHandRotation: -1.2,
      rightElbow: { x: 350, y: 460 }, rightWrist: { x: 300, y: 420 }, rightFingersState: 'point', rightHandRotation: -1.2 },
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 170, y: 480 }, leftWrist: { x: 220, y: 440 }, leftFingersState: 'point', leftHandRotation: -1.6,
      rightElbow: { x: 430, y: 480 }, rightWrist: { x: 380, y: 440 }, rightFingersState: 'point', rightHandRotation: -0.8 },
  ],
  MORE: [
    { ...REST_POSE,
      leftElbow: { x: 250, y: 460 }, leftWrist: { x: 300, y: 420 }, leftFingersState: 'flat', leftHandRotation: -1.2,
      rightElbow: { x: 350, y: 460 }, rightWrist: { x: 300, y: 420 }, rightFingersState: 'flat', rightHandRotation: -1.2 },
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 255, y: 455 }, leftWrist: { x: 305, y: 410 }, leftFingersState: 'flat', leftHandRotation: -1.2,
      rightElbow: { x: 345, y: 455 }, rightWrist: { x: 295, y: 410 }, rightFingersState: 'flat', rightHandRotation: -1.2 },
  ],
  ALL: [
    { ...REST_POSE,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 270, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 450 }, rightWrist: { x: 290, y: 430 }, rightFingersState: 'open', rightHandRotation: 0.6 },
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 270, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 420, y: 450 }, rightWrist: { x: 350, y: 440 }, rightFingersState: 'flat', rightHandRotation: -0.6 },
  ],
  NOW: [
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 220, y: 470 }, leftWrist: { x: 280, y: 430 }, leftFingersState: 'open', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 470 }, rightWrist: { x: 320, y: 430 }, rightFingersState: 'open', rightHandRotation: -1.5 },
    { ...REST_POSE, eyebrowsHeight: 0.35,
      leftElbow: { x: 220, y: 490 }, leftWrist: { x: 280, y: 470 }, leftFingersState: 'open', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 490 }, rightWrist: { x: 320, y: 470 }, rightFingersState: 'open', rightHandRotation: -1.5 },
  ],
  TOMORROW: [
    { ...REST_POSE,
      rightElbow: { x: 420, y: 400 }, rightWrist: { x: 340, y: 300 }, rightFingersState: 'fist', rightHandRotation: -0.6 },
    { ...REST_POSE, headTilt: 0.04,
      rightElbow: { x: 450, y: 380 }, rightWrist: { x: 380, y: 270 }, rightFingersState: 'fist', rightHandRotation: -0.2 },
  ],
  YESTERDAY: [
    { ...REST_POSE,
      rightElbow: { x: 420, y: 400 }, rightWrist: { x: 340, y: 300 }, rightFingersState: 'fist', rightHandRotation: -0.6 },
    { ...REST_POSE, headTilt: -0.04,
      rightElbow: { x: 440, y: 420 }, rightWrist: { x: 370, y: 350 }, rightFingersState: 'fist', rightHandRotation: -1.0 },
  ],
  TIME: [
    { ...REST_POSE,
      leftElbow: { x: 220, y: 480 }, leftWrist: { x: 290, y: 450 }, leftFingersState: 'fist', leftHandRotation: 0,
      rightElbow: { x: 360, y: 450 }, rightWrist: { x: 300, y: 440 }, rightFingersState: 'point', rightHandRotation: 0 },
    { ...REST_POSE,
      leftElbow: { x: 220, y: 480 }, leftWrist: { x: 290, y: 450 }, leftFingersState: 'fist', leftHandRotation: 0,
      rightElbow: { x: 360, y: 460 }, rightWrist: { x: 300, y: 450 }, rightFingersState: 'point', rightHandRotation: 0 },
  ],
  NIGHT: [
    { ...REST_POSE,
      leftElbow: { x: 200, y: 480 }, leftWrist: { x: 280, y: 460 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 440 }, rightWrist: { x: 300, y: 430 }, rightFingersState: 'flat', rightHandRotation: -0.3 },
    { ...REST_POSE,
      leftElbow: { x: 200, y: 480 }, leftWrist: { x: 280, y: 460 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 460 }, rightWrist: { x: 290, y: 450 }, rightFingersState: 'flat', rightHandRotation: -0.2 },
  ],
  MONEY: [
    { ...REST_POSE,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 440 }, rightWrist: { x: 290, y: 430 }, rightFingersState: 'flat', rightHandRotation: -1.4 },
    { ...REST_POSE,
      leftElbow: { x: 200, y: 470 }, leftWrist: { x: 280, y: 450 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 360, y: 455 }, rightWrist: { x: 290, y: 445 }, rightFingersState: 'flat', rightHandRotation: -1.4 },
  ],
  PHONE: [
    { ...REST_POSE, headTilt: -0.05,
      rightElbow: { x: 440, y: 380 }, rightWrist: { x: 360, y: 260 }, rightFingersState: 'open', rightHandRotation: -0.2 },
  ],
  BOOK: [
    { ...REST_POSE,
      leftElbow: { x: 240, y: 470 }, leftWrist: { x: 300, y: 440 }, leftFingersState: 'flat', leftHandRotation: 0.2,
      rightElbow: { x: 360, y: 470 }, rightWrist: { x: 300, y: 440 }, rightFingersState: 'flat', rightHandRotation: -0.2 },
    { ...REST_POSE, eyebrowsHeight: 0.3,
      leftElbow: { x: 200, y: 480 }, leftWrist: { x: 260, y: 450 }, leftFingersState: 'flat', leftHandRotation: 0.6,
      rightElbow: { x: 400, y: 480 }, rightWrist: { x: 340, y: 450 }, rightFingersState: 'flat', rightHandRotation: -0.6 },
  ],
  MAYBE: [
    { ...REST_POSE, eyebrowsHeight: 0.2,
      leftElbow: { x: 220, y: 470 }, leftWrist: { x: 280, y: 420 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 490 }, rightWrist: { x: 320, y: 470 }, rightFingersState: 'flat', rightHandRotation: -1.5 },
    { ...REST_POSE, eyebrowsHeight: 0.25, headTilt: 0.03,
      leftElbow: { x: 220, y: 490 }, leftWrist: { x: 280, y: 470 }, leftFingersState: 'flat', leftHandRotation: 1.5,
      rightElbow: { x: 380, y: 470 }, rightWrist: { x: 320, y: 420 }, rightFingersState: 'flat', rightHandRotation: -1.5 },
  ],
  OK: [
    { ...REST_POSE, eyebrowsHeight: 0.4, mouthScaleY: 0.35,
      rightElbow: { x: 440, y: 420 }, rightWrist: { x: 360, y: 320 }, rightFingersState: 'hook', rightHandRotation: -0.3 },
    { ...REST_POSE, eyebrowsHeight: 0.45, mouthScaleY: 0.4,
      rightElbow: { x: 445, y: 415 }, rightWrist: { x: 365, y: 310 }, rightFingersState: 'hook', rightHandRotation: -0.2 },
  ],

};

// Synonyms → existing keyframe entries.
export const GLOSS_ALIASES: Record<string, string> = {
  HI: 'HELLO',
  GOODBYE: 'BYE',
  THANK: 'THANK_YOU',
  'THANK-YOU': 'THANK_YOU',
  THANKS: 'THANK_YOU',
  LOVE: 'LOVE',
  I: 'ME',
  MY: 'ME',
  MINE: 'ME',
  YOUR: 'YOU',
  HAPPY: 'HAPPINESS',
  GOOD: 'GOOD',
  WATER: 'DRINK',
  NEED: 'WANT',
  SCHOOL: 'WORK',
  WHERE: 'WHAT',
  WHO: 'WHAT',
  WHY: 'WHAT',
  HOW: 'WHAT',
  WHEN: 'WHAT',
  WELCOME: 'WELCOME',
  KNOW: 'UNDERSTAND',
  THEM: 'THEY',
  HER: 'SHE',
  HIM: 'HE',
  US: 'WE',
  OUR: 'WE',
  FOOD: 'EAT',
  SPEAK: 'TALK',
  SAY: 'TALK',
  CORRECT: 'RIGHT',
  MOM: 'MOTHER',
  MUM: 'MOTHER',
  DAD: 'FATHER',
  FATHER: 'FATHER',
  CHILD: 'BABY',
  LARGE: 'BIG',
  LITTLE: 'SMALL',
  WARM: 'HOT',
  COOL: 'COLD',
  PRETTY: 'BEAUTIFUL',
  TODAY: 'NOW',
  CELL: 'PHONE',
  MOBILE: 'PHONE',
  REMEMBER: 'REMEMBER',
  HEAR: 'LISTEN',
  GET: 'TAKE',
  DONE: 'FINISH',
  BEGIN: 'START',
  PERHAPS: 'MAYBE',
  OKAY: 'OK',
  GREAT: 'GOOD',
};

// ─── Fingerspelling (A–Z, 0–9) ────────────────────────────────────────────────
// The 2D renderer supports 7 handshapes; each letter maps to its closest shape,
// held at a raised "spelling" position by the dominant (right) hand.
const LETTER_STATE: Record<string, FingerState> = {
  A: 'fist', B: 'flat', C: 'c-shape', D: 'point', E: 'fist', F: 'open',
  G: 'point', H: 'peace', I: 'fist', J: 'fist', K: 'peace', L: 'point',
  M: 'fist', N: 'fist', O: 'c-shape', P: 'point', Q: 'point', R: 'peace',
  S: 'fist', T: 'fist', U: 'peace', V: 'peace', W: 'open', X: 'hook',
  Y: 'open', Z: 'point',
};

/** A single fingerspelled character held at the raised spelling position. */
export function letterPose(ch: string): Pose {
  const c = ch.toUpperCase();
  const state = LETTER_STATE[c] ?? 'open';
  return {
    ...REST_POSE,
    eyebrowsHeight: 0.2,
    rightShoulder: { x: 400, y: 380 },
    rightElbow: { x: 450, y: 390 },
    rightWrist: { x: 380, y: 300 }, // raised near shoulder, palm to viewer
    rightFingersState: state,
    rightHandRotation: -0.1,
  };
}

// Neutral "signing" gesture for glosses with no dedicated keyframe.
const FALLBACK: Pose[] = [
  { ...REST_POSE, eyebrowsHeight: 0.2,
    leftElbow: { x: 210, y: 480 }, leftWrist: { x: 270, y: 450 }, leftFingersState: 'open', leftHandRotation: 0.5,
    rightElbow: { x: 390, y: 480 }, rightWrist: { x: 330, y: 450 }, rightFingersState: 'open', rightHandRotation: -0.5 },
  { ...REST_POSE, eyebrowsHeight: 0.25,
    leftElbow: { x: 200, y: 470 }, leftWrist: { x: 255, y: 430 }, leftFingersState: 'open', leftHandRotation: 0.7,
    rightElbow: { x: 400, y: 470 }, rightWrist: { x: 345, y: 430 }, rightFingersState: 'open', rightHandRotation: -0.7 },
];

/**
 * Resolve the keyframe sequence for a gloss entry.
 * - single character or fingerspell flag → letter handshape
 * - direct keyframe / alias hit          → that gesture
 * - otherwise                            → neutral fallback gesture
 */
export function resolveKeyframes(gloss: string, fingerspell?: boolean): Pose[] {
  const g = gloss.toUpperCase().trim();
  if ((fingerspell && g.length === 1) || /^[A-Z0-9]$/.test(g)) {
    return [letterPose(g)];
  }
  const norm = g.replace(/-/g, '_');
  if (GESTURE_KEYFRAMES[norm]) return GESTURE_KEYFRAMES[norm];
  const alias = GLOSS_ALIASES[g] ?? GLOSS_ALIASES[norm];
  if (alias && GESTURE_KEYFRAMES[alias]) return GESTURE_KEYFRAMES[alias];
  return FALLBACK;
}
