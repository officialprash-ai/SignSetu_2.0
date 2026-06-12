import { Suspense, useEffect, useMemo, useRef, useState, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface GlossEntry {
  gloss: string;
  startMs: number;
  endMs: number;
  confidence: number;
  fingerspell?: boolean;
}

export interface SignAvatarProps {
  glossSequence?: GlossEntry[];
  isPlaying?: boolean;
  playbackSpeed?: number;
  onGlossChange?: (index: number) => void;
  onAnimationComplete?: () => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type JA = [number, number, number];

interface HandShape {
  fingers: [number, number, number, number]; // index, middle, ring, pinky  0=open 1=closed
  thumb: number;                             // 0=open 1=closed
  wristY?: number;
}

interface ArmPose {
  upper: JA;   // upper arm rotation x,y,z
  lower: JA;   // forearm rotation
  wrist: JA;   // wrist rotation
  hand: HandShape;
}

interface FullPose { L: ArmPose; R: ArmPose; }

// ─── Preset hand shapes ───────────────────────────────────────────────────────
const OPEN:  HandShape = { fingers:[0,   0,   0,   0  ], thumb:0.5 };
const FIST:  HandShape = { fingers:[1,   1,   1,   1  ], thumb:0.3 };
const INDEX: HandShape = { fingers:[1,   1,   1,   0  ], thumb:1   };
const TWO:   HandShape = { fingers:[1,   1,   0,   0  ], thumb:1   };
const CLAW:  HandShape = { fingers:[0.5, 0.5, 0.5, 0.5], thumb:0.3 };
const PINCH: HandShape = { fingers:[0.5, 0.5, 0.5, 0.5], thumb:0.2 };
const FLAT:  HandShape = { fingers:[0,   0,   0,   0  ], thumb:0.8 };

const NEUTRAL: FullPose = {
  L: { upper:[0.05,0, 0.45], lower:[0,0,0], wrist:[0,0,0], hand:OPEN },
  R: { upper:[0.05,0,-0.45], lower:[0,0,0], wrist:[0,0,0], hand:OPEN },
};

// ─── Named sign poses ─────────────────────────────────────────────────────────
const NAMED_POSES: Record<string, FullPose> = {
  HELLO:       { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[-1.3,0.1,-0.3],lower:[-0.5,0,0.3],wrist:[0.3,0.1,0],hand:FLAT} },
  HI:          { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[-1.3,0.1,-0.3],lower:[-0.5,0,0.3],wrist:[0.3,0.1,0],hand:FLAT} },
  // Namaste — both palms pressed together at chest
  NAMASTE:     { L:{upper:[0.5,0,0.18], lower:[-1.05,0,0.12], wrist:[0,0,0.1],  hand:FLAT},
                 R:{upper:[0.5,0,-0.18],lower:[-1.05,0,-0.12],wrist:[0,0,-0.1], hand:FLAT} },
  BYE:         { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[-1.1,0,-0.4],lower:[-0.3,0,0.2], wrist:[0.4,0.2,0],hand:OPEN} },
  GOODBYE:     { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[-1.1,0,-0.4],lower:[-0.3,0,0.2], wrist:[0.4,0.2,0],hand:OPEN} },
  'THANK-YOU': { L:{upper:[0.4,0,0.3], lower:[-0.8,0,0.2], wrist:[0,0.3,0],  hand:OPEN},
                 R:{upper:[0.4,0,-0.3],lower:[-0.8,0,-0.2], wrist:[0,-0.3,0], hand:OPEN} },
  THANK:       { L:{upper:[0.4,0,0.3], lower:[-0.8,0,0.2], wrist:[0,0.3,0],  hand:OPEN},
                 R:{upper:[0.4,0,-0.3],lower:[-0.8,0,-0.2], wrist:[0,-0.3,0], hand:OPEN} },
  PLEASE:      { L:{upper:[0.05,0,0.5],lower:[0.2,0,0],     wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0.6,-0.1,-0.4],lower:[-0.5,0,0], wrist:[0.2,0,0],  hand:FLAT} },
  SORRY:       { L:{upper:[0.6,0,0.2], lower:[-0.7,0,0.1], wrist:[0.1,0,0],  hand:FIST},
                 R:{upper:[0.6,0,-0.2],lower:[-0.7,0,-0.1], wrist:[0.1,0,0],  hand:FIST} },
  WELCOME:     { L:{upper:[0.05,0,0.5],lower:[0,0,0],       wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0.2,0,-0.6],lower:[-0.4,0,0.2],  wrist:[0,0,0],    hand:OPEN} },
  YES:         { L:{upper:[-1.5,0,0.2],lower:[-0.4,0,0],    wrist:[0.2,0,0],  hand:OPEN},
                 R:{upper:[-1.3,0,-0.3],lower:[-0.5,0,0],   wrist:[0.3,0,0],  hand:FIST} },
  NO:          { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0.1,0,-0.5],lower:[-0.3,0,0.2],  wrist:[0,0,0],    hand:TWO } },
  I:           { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0.5,0,-0.3], lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:FIST} },
  ME:          { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0.5,0,-0.3], lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:FIST} },
  YOU:         { L:{upper:[0.05,0,0.45],lower:[0.3,0,0],    wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0,0.5,-0.5], lower:[0,0,-0.3],   wrist:[0,0,0],    hand:INDEX} },
  LOVE:        { L:{upper:[0.6,0,0.3], lower:[-0.6,0,0.1], wrist:[0.1,0,0],  hand:FIST},
                 R:{upper:[0.6,0,-0.3],lower:[-0.6,0,-0.1], wrist:[0.1,0,0],  hand:FIST} },
  GOOD:        { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0.4,0,-0.3],lower:[-0.7,0,0.1],  wrist:[0,0,0],    hand:FLAT} },
  BAD:         { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0.4,0,-0.3],lower:[-0.7,0,0.1],  wrist:[0.3,0,0],  hand:FLAT} },
  HAPPY:       { L:{upper:[0.4,0,0.3], lower:[-0.6,0,0.1], wrist:[0.1,0,0],  hand:OPEN},
                 R:{upper:[0.4,0,-0.3],lower:[-0.6,0,-0.1], wrist:[0.1,0,0],  hand:OPEN} },
  HELP:        { L:{upper:[0.3,0,0.4], lower:[-0.5,0,0.2], wrist:[0,0,0],    hand:FIST},
                 R:{upper:[0.3,0,-0.5],lower:[-0.3,0,0],    wrist:[0,0,0],    hand:FLAT} },
  KNOW:        { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[-0.9,0.2,-0.4],lower:[-0.5,0.1,0.2],wrist:[0.1,0,0],hand:FLAT} },
  GO:          { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0,0.2,-0.6], lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:INDEX} },
  STOP:        { L:{upper:[0.2,0,0.5], lower:[-0.4,0,0.2], wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[0.2,0,-0.5],lower:[-0.6,0,0],    wrist:[0.3,0,0],  hand:FLAT} },
  WHAT:        { L:{upper:[-0.8,0,0.3],lower:[-0.5,0,0.2], wrist:[0.5,0,0],  hand:OPEN},
                 R:{upper:[-0.8,0,-0.3],lower:[-0.5,0,-0.2],wrist:[0.5,0,0],  hand:OPEN} },
  WHERE:       { L:{upper:[-0.8,0,0.3],lower:[-0.5,0,0.2], wrist:[0.5,0,0],  hand:OPEN},
                 R:{upper:[-0.8,0,-0.3],lower:[-0.5,0,-0.2],wrist:[0.5,0,0],  hand:OPEN} },
  HOW:         { L:{upper:[-0.6,0,0.3],lower:[-0.4,0,0.2], wrist:[0.3,0,0],  hand:FIST},
                 R:{upper:[-0.6,0,-0.3],lower:[-0.4,0,-0.2],wrist:[0.3,0,0],  hand:FIST} },
  WHO:         { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[-0.8,0.1,-0.3],lower:[-0.4,0,0.2],wrist:[0.2,0,0], hand:INDEX} },
  WORK:        { L:{upper:[0.2,0,0.4], lower:[-0.5,0,0.2], wrist:[0.2,0,0],  hand:FIST},
                 R:{upper:[0.2,0,-0.4],lower:[-0.5,0,-0.2], wrist:[0.2,0,0],  hand:FIST} },
  UNDERSTAND:  { L:{upper:[0.05,0,0.45],lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[-1.1,0.1,-0.3],lower:[-0.4,0,0.2],wrist:[0.2,0,0], hand:INDEX} },
  NAME:        { L:{upper:[0.05,0,0.45],lower:[0.3,0,0],    wrist:[0,0,0],    hand:OPEN},
                 R:{upper:[-1.0,0.2,-0.3],lower:[-0.6,0.1,0.2],wrist:[0.2,-0.2,0],hand:TWO} },
  // fallback pool
  _p0: {L:{upper:[-0.2,0,1.3],lower:[-0.3,0,0.2],wrist:[0,0,0],hand:OPEN},R:{upper:[-0.2,0,-1.3],lower:[-0.3,0,-0.2],wrist:[0,0,0],hand:OPEN}},
  _p1: {L:{upper:[-0.5,0,0.5],lower:[-0.4,0,0.2],wrist:[0.2,0,0],hand:FIST},R:{upper:[-0.5,0,-0.5],lower:[-0.4,0,-0.2],wrist:[0.2,0,0],hand:FIST}},
  _p2: {L:{upper:[0.3,0,0.6],lower:[-0.5,0,0.3],wrist:[0,0.2,0],hand:OPEN},R:{upper:[0.3,0,-0.6],lower:[-0.5,0,-0.3],wrist:[0,-0.2,0],hand:OPEN}},
  _p3: {L:{upper:[-0.8,0,0.4],lower:[-0.3,0,0.2],wrist:[0.1,0,0],hand:CLAW},R:{upper:[-0.8,0,-0.4],lower:[-0.3,0,-0.2],wrist:[0.1,0,0],hand:CLAW}},
};

const _POOL = Object.keys(NAMED_POSES).filter(k=>k.startsWith('_p')).map(k=>NAMED_POSES[k]);

// ─── Fingerspelling ───────────────────────────────────────────────────────────
const FS_ARM: Pick<ArmPose,'upper'|'lower'|'wrist'> = { upper:[0.25,0,-0.55], lower:[-0.75,0,0], wrist:[0,0,0] };

const LETTER_SHAPES: Record<string, HandShape> = {
  A:{fingers:[1,1,1,1],thumb:0.3}, B:{fingers:[0,0,0,0],thumb:1},
  C:{fingers:[0.4,0.4,0.4,0.4],thumb:0.4}, D:{fingers:[1,1,1,0],thumb:0.5},
  E:{fingers:[0.8,0.8,0.8,0.8],thumb:1}, F:{fingers:[0,0,0,1],thumb:0,wristY:0.2},
  G:{fingers:[1,1,1,0],thumb:0,wristY:-0.6}, H:{fingers:[1,1,0,0],thumb:1,wristY:-0.6},
  I:{fingers:[0,1,1,1],thumb:1}, J:{fingers:[0,1,1,1],thumb:1},
  K:{fingers:[1,1,0,0],thumb:0.5}, L:{fingers:[1,1,1,0],thumb:0},
  M:{fingers:[0.5,0.5,0.5,0.5],thumb:1}, N:{fingers:[1,0.5,0.5,0.5],thumb:1},
  O:{fingers:[0.5,0.5,0.5,0.5],thumb:0.3}, P:{fingers:[1,1,0,0],thumb:0.5,wristY:-0.3},
  Q:{fingers:[1,1,1,0],thumb:0,wristY:-0.4}, R:{fingers:[1,1,0,0],thumb:1},
  S:{fingers:[1,1,1,1],thumb:0}, T:{fingers:[1,1,1,1],thumb:0.5},
  U:{fingers:[1,1,0,0],thumb:1}, V:{fingers:[1,1,0,0],thumb:1,wristY:0.3},
  W:{fingers:[1,0,0,0],thumb:1}, X:{fingers:[1,1,1,0.6],thumb:1},
  Y:{fingers:[0,1,1,1],thumb:0}, Z:{fingers:[1,1,1,0],thumb:1},
};

function getLetterPose(char: string): FullPose {
  const shape = LETTER_SHAPES[char.toUpperCase()] ?? LETTER_SHAPES.A;
  return { L:{...NEUTRAL.L}, R:{...FS_ARM, wrist:[0,shape.wristY??0,0], hand:shape} };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31,h) + s.charCodeAt(i))|0;
  return Math.abs(h);
}

function resolvePose(entry: GlossEntry): FullPose {
  if (entry.fingerspell && entry.gloss.length===1) return getLetterPose(entry.gloss);
  const g = entry.gloss.toUpperCase();
  if (NAMED_POSES[g]) return NAMED_POSES[g];
  for (const key of Object.keys(NAMED_POSES)) {
    if (key.startsWith('_')) continue;
    if (g.includes(key) || key.includes(g)) return NAMED_POSES[key];
  }
  return _POOL[hashStr(g) % _POOL.length];
}

// ─── Bone name maps (Ready Player Me + Mixamo both supported) ─────────────────
// Keys we look up on the skeleton; first match wins.
const BONE_ALIASES: Record<string, string[]> = {
  LeftArm:      ['LeftArm','Left_Arm','mixamorigLeftArm'],
  RightArm:     ['RightArm','Right_Arm','mixamorigRightArm'],
  LeftForeArm:  ['LeftForeArm','Left_ForeArm','mixamorigLeftForeArm'],
  RightForeArm: ['RightForeArm','Right_ForeArm','mixamorigRightForeArm'],
  LeftHand:     ['LeftHand','Left_Hand','mixamorigLeftHand'],
  RightHand:    ['RightHand','Right_Hand','mixamorigRightHand'],

  // Fingers (index, middle, ring, pinky) – proximal & mid phalanges
  LI1:  ['LeftHandIndex1','mixamorigLeftHandIndex1'],
  LI2:  ['LeftHandIndex2','mixamorigLeftHandIndex2'],
  LM1:  ['LeftHandMiddle1','mixamorigLeftHandMiddle1'],
  LM2:  ['LeftHandMiddle2','mixamorigLeftHandMiddle2'],
  LR1:  ['LeftHandRing1','mixamorigLeftHandRing1'],
  LR2:  ['LeftHandRing2','mixamorigLeftHandRing2'],
  LP1:  ['LeftHandPinky1','mixamorigLeftHandPinky1'],
  LP2:  ['LeftHandPinky2','mixamorigLeftHandPinky2'],

  RI1:  ['RightHandIndex1','mixamorigRightHandIndex1'],
  RI2:  ['RightHandIndex2','mixamorigRightHandIndex2'],
  RM1:  ['RightHandMiddle1','mixamorigRightHandMiddle1'],
  RM2:  ['RightHandMiddle2','mixamorigRightHandMiddle2'],
  RR1:  ['RightHandRing1','mixamorigRightHandRing1'],
  RR2:  ['RightHandRing2','mixamorigRightHandRing2'],
  RP1:  ['RightHandPinky1','mixamorigRightHandPinky1'],
  RP2:  ['RightHandPinky2','mixamorigRightHandPinky2'],

  LT1:  ['LeftHandThumb1','mixamorigLeftHandThumb1'],
  LT2:  ['LeftHandThumb2','mixamorigLeftHandThumb2'],
  RT1:  ['RightHandThumb1','mixamorigRightHandThumb1'],
  RT2:  ['RightHandThumb2','mixamorigRightHandThumb2'],

  Spine: ['Spine','Spine1','mixamorigSpine'],
  Head:  ['Head','mixamorigHead'],
};

function findBone(map: Map<string, THREE.Bone>, key: string): THREE.Bone | null {
  const aliases = BONE_ALIASES[key] ?? [key];
  for (const a of aliases) { const b = map.get(a); if (b) return b; }
  return null;
}

function lerpBone(bone: THREE.Bone | null, tx: number, ty: number, tz: number, a: number) {
  if (!bone) return;
  bone.rotation.x += (tx - bone.rotation.x) * a;
  bone.rotation.y += (ty - bone.rotation.y) * a;
  bone.rotation.z += (tz - bone.rotation.z) * a;
}

// ─── GLB avatar scene ─────────────────────────────────────────────────────────
function GLBAvatar({
  url,
  scale,
  glossSequence,
  isPlaying,
  playbackSpeed,
  onGlossChange,
  onAnimationComplete,
}: {
  url: string;
  scale: number;
  glossSequence: GlossEntry[];
  isPlaying: boolean;
  playbackSpeed: number;
  onGlossChange?: (i: number) => void;
  onAnimationComplete?: () => void;
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);

  const bonesRef = useRef<Map<string, THREE.Bone>>(new Map());

  useEffect(() => {
    const map = new Map<string, THREE.Bone>();
    cloned.traverse(obj => { if ((obj as THREE.Bone).isBone) map.set(obj.name, obj as THREE.Bone); });
    bonesRef.current = map;
    // Log found bones in dev so users can verify naming
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SignAvatar] bones found:', [...map.keys()].join(', '));
    }
  }, [cloned]);

  const elapsedRef  = useRef(0);
  const prevIdxRef  = useRef(-1);
  const poseRef     = useRef<FullPose>(NEUTRAL);
  const idleRef     = useRef(0);

  useEffect(() => {
    elapsedRef.current = 0;
    prevIdxRef.current = -1;
    poseRef.current    = NEUTRAL;
  }, [glossSequence]);

  useFrame((_, delta) => {
    idleRef.current += delta;
    const B = bonesRef.current;
    const alpha = Math.min(0.09 + delta * 2.5, 0.22);

    // Subtle breathing on spine
    const breathe = Math.sin(idleRef.current * 1.1) * 0.008;
    const spine = findBone(B, 'Spine');
    if (spine) spine.rotation.x += (breathe - spine.rotation.x) * 0.04;

    if (!isPlaying || glossSequence.length === 0) {
      applyPose(NEUTRAL, B, 0.04);
      return;
    }

    elapsedRef.current += delta * 1000 * playbackSpeed;
    const ms = elapsedRef.current;
    let activeIdx = -1;
    for (let i = 0; i < glossSequence.length; i++) {
      if (ms >= glossSequence[i].startMs && ms < glossSequence[i].endMs) { activeIdx = i; break; }
    }

    if (activeIdx !== prevIdxRef.current) {
      prevIdxRef.current = activeIdx;
      if (activeIdx >= 0) {
        poseRef.current = resolvePose(glossSequence[activeIdx]);
        onGlossChange?.(activeIdx);
      } else if (ms >= (glossSequence[glossSequence.length - 1]?.endMs ?? 0)) {
        elapsedRef.current = 0;
        prevIdxRef.current = -1;
        poseRef.current    = NEUTRAL;
        onAnimationComplete?.();
      }
    }

    applyPose(poseRef.current, B, alpha);
  });

  return <primitive object={cloned} scale={scale} position={[0, -1.0 * scale / 0.55, 0]} />;
}

// ─── Bone animation ───────────────────────────────────────────────────────────
const MAX_PROX = 1.1; // radians, finger proximal curl
const MAX_MID  = 0.85;

function applyPose(pose: FullPose, B: Map<string, THREE.Bone>, a: number) {
  const { L, R } = pose;

  // Arms
  lerpBone(findBone(B,'LeftArm'),     L.upper[0], L.upper[1], L.upper[2], a);
  lerpBone(findBone(B,'RightArm'),    R.upper[0], R.upper[1], R.upper[2], a);
  lerpBone(findBone(B,'LeftForeArm'), L.lower[0], L.lower[1], L.lower[2], a);
  lerpBone(findBone(B,'RightForeArm'),R.lower[0], R.lower[1], R.lower[2], a);
  lerpBone(findBone(B,'LeftHand'),    L.wrist[0], L.wrist[1], L.wrist[2], a);
  lerpBone(findBone(B,'RightHand'),   R.wrist[0], R.wrist[1], R.wrist[2], a);

  // Left fingers [index, middle, ring, pinky]
  const lf = L.hand.fingers;
  lerpBoneX(findBone(B,'LI1'), -lf[0]*MAX_PROX, a); lerpBoneX(findBone(B,'LI2'), -lf[0]*MAX_MID, a);
  lerpBoneX(findBone(B,'LM1'), -lf[1]*MAX_PROX, a); lerpBoneX(findBone(B,'LM2'), -lf[1]*MAX_MID, a);
  lerpBoneX(findBone(B,'LR1'), -lf[2]*MAX_PROX, a); lerpBoneX(findBone(B,'LR2'), -lf[2]*MAX_MID, a);
  lerpBoneX(findBone(B,'LP1'), -lf[3]*MAX_PROX, a); lerpBoneX(findBone(B,'LP2'), -lf[3]*MAX_MID, a);
  lerpBoneX(findBone(B,'LT1'), L.hand.thumb*0.5 - 0.1, a);
  lerpBoneX(findBone(B,'LT2'), L.hand.thumb*0.4, a);

  // Right fingers
  const rf = R.hand.fingers;
  lerpBoneX(findBone(B,'RI1'), -rf[0]*MAX_PROX, a); lerpBoneX(findBone(B,'RI2'), -rf[0]*MAX_MID, a);
  lerpBoneX(findBone(B,'RM1'), -rf[1]*MAX_PROX, a); lerpBoneX(findBone(B,'RM2'), -rf[1]*MAX_MID, a);
  lerpBoneX(findBone(B,'RR1'), -rf[2]*MAX_PROX, a); lerpBoneX(findBone(B,'RR2'), -rf[2]*MAX_MID, a);
  lerpBoneX(findBone(B,'RP1'), -rf[3]*MAX_PROX, a); lerpBoneX(findBone(B,'RP2'), -rf[3]*MAX_MID, a);
  lerpBoneX(findBone(B,'RT1'), R.hand.thumb*0.5 - 0.1, a);
  lerpBoneX(findBone(B,'RT2'), R.hand.thumb*0.4, a);
}

function lerpBoneX(bone: THREE.Bone | null, target: number, a: number) {
  if (!bone) return;
  bone.rotation.x += (target - bone.rotation.x) * a;
}

// ─── Fallback placeholder (shown while GLB not yet placed) ───────────────────
function FallbackAvatar() {
  return (
    <group position={[0, -0.8, 0]}>
      {/* Body */}
      <mesh position={[0, 1.1, 0]}>
        <capsuleGeometry args={[0.18, 0.55, 6, 12]} />
        <meshStandardMaterial color="#3B82F6" roughness={0.5} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.75, 0]}>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshStandardMaterial color="#E8B89A" roughness={0.5} />
      </mesh>
      {/* Eyes */}
      {([-0.065, 0.065] as const).map((x, i) => (
        <mesh key={i} position={[x, 1.77, 0.16]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshStandardMaterial color="#F8F8F8" roughness={0.1} />
        </mesh>
      ))}
      <mesh position={[0, 1.68, 0.17]}>
        <sphereGeometry args={[0.016, 10, 8]} />
        <meshStandardMaterial color="#E8B89A" roughness={0.5} />
      </mesh>
    </group>
  );
}

// ─── Loading spinner overlay ──────────────────────────────────────────────────
function LoadingFallback() {
  return (
    <group>
      <FallbackAvatar />
    </group>
  );
}

// ─── Detect if avatar.glb exists by preloading ───────────────────────────────
// We always try to load; if it fails we catch it with an error boundary.
const AVATAR_URL = '/ready_player_me_male_avatar__vrchatgame.glb';

// ─── Error boundary for missing GLB ──────────────────────────────────────────
class GLBErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return <LoadingFallback />;
    }
    return this.props.children;
  }
}

// ─── Main scene wrapper ───────────────────────────────────────────────────────
function AvatarScene(props: {
  scale: number;
  glossSequence: GlossEntry[];
  isPlaying: boolean;
  playbackSpeed: number;
  onGlossChange?: (i: number) => void;
  onAnimationComplete?: () => void;
}) {
  return (
    <GLBErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <GLBAvatar url={AVATAR_URL} {...props} />
      </Suspense>
    </GLBErrorBoundary>
  );
}

// ─── Zoom button ──────────────────────────────────────────────────────────────
function ZoomBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.25)',
        background: 'rgba(15,23,42,0.55)',
        backdropFilter: 'blur(6px)',
        color: '#fff',
        fontSize: 20,
        lineHeight: 1,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 400,
        userSelect: 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.7)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.55)')}
    >
      {label}
    </button>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
const MIN_SCALE = 0.15;
const MAX_SCALE = 0.8;
const STEP      = 0.06;
const BASE_SCALE = 0.4;

export function SignAvatar({
  glossSequence = [],
  isPlaying = false,
  playbackSpeed = 1,
  onGlossChange,
  onAnimationComplete,
}: SignAvatarProps) {
  const [avatarScale, setAvatarScale] = useState(BASE_SCALE);

  const zoomIn  = () => setAvatarScale(s => Math.min(+(s + STEP).toFixed(3), MAX_SCALE));
  const zoomOut = () => setAvatarScale(s => Math.max(+(s - STEP).toFixed(3), MIN_SCALE));
  const reset   = () => setAvatarScale(BASE_SCALE);

  const pct = Math.round(((avatarScale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100);

  return (
    <div
      className="w-full h-full bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl overflow-hidden"
      style={{ position: 'relative' }}
    >
      <Canvas camera={{ position: [0, -0.05, 4.2], fov: 32 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 5, 4]}  intensity={1.4} castShadow />
        <directionalLight position={[-2, 3, 2]} intensity={0.5} color="#ffe8d6" />
        <directionalLight position={[0, -1, 3]} intensity={0.15} color="#b0c8ff" />
        <Environment preset="studio" />
        <AvatarScene
          scale={avatarScale}
          glossSequence={glossSequence}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onGlossChange={onGlossChange}
          onAnimationComplete={onAnimationComplete}
        />
        <OrbitControls
          target={[0, -0.05, 0]}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>

      {/* Zoom controls overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          right: 14,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          zIndex: 10,
        }}
      >
        <ZoomBtn label="+" onClick={zoomIn} />
        {/* percentage pill */}
        <button
          onClick={reset}
          title="Reset zoom"
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.8)',
            background: 'rgba(15,23,42,0.45)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12,
            padding: '2px 8px',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            userSelect: 'none',
          }}
        >
          {pct}%
        </button>
        <ZoomBtn label="−" onClick={zoomOut} />
      </div>
    </div>
  );
}

// Preload hint so Three.js starts fetching early
useGLTF.preload(AVATAR_URL);

