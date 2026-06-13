import { Suspense, useEffect, useMemo, useRef, useState, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
  LI3:  ['LeftHandIndex3','mixamorigLeftHandIndex3'],
  LM1:  ['LeftHandMiddle1','mixamorigLeftHandMiddle1'],
  LM2:  ['LeftHandMiddle2','mixamorigLeftHandMiddle2'],
  LM3:  ['LeftHandMiddle3','mixamorigLeftHandMiddle3'],
  LR1:  ['LeftHandRing1','mixamorigLeftHandRing1'],
  LR2:  ['LeftHandRing2','mixamorigLeftHandRing2'],
  LR3:  ['LeftHandRing3','mixamorigLeftHandRing3'],
  LP1:  ['LeftHandPinky1','mixamorigLeftHandPinky1'],
  LP2:  ['LeftHandPinky2','mixamorigLeftHandPinky2'],
  LP3:  ['LeftHandPinky3','mixamorigLeftHandPinky3'],

  RI1:  ['RightHandIndex1','mixamorigRightHandIndex1'],
  RI2:  ['RightHandIndex2','mixamorigRightHandIndex2'],
  RI3:  ['RightHandIndex3','mixamorigRightHandIndex3'],
  RM1:  ['RightHandMiddle1','mixamorigRightHandMiddle1'],
  RM2:  ['RightHandMiddle2','mixamorigRightHandMiddle2'],
  RM3:  ['RightHandMiddle3','mixamorigRightHandMiddle3'],
  RR1:  ['RightHandRing1','mixamorigRightHandRing1'],
  RR2:  ['RightHandRing2','mixamorigRightHandRing2'],
  RR3:  ['RightHandRing3','mixamorigRightHandRing3'],
  RP1:  ['RightHandPinky1','mixamorigRightHandPinky1'],
  RP2:  ['RightHandPinky2','mixamorigRightHandPinky2'],
  RP3:  ['RightHandPinky3','mixamorigRightHandPinky3'],

  LT1:  ['LeftHandThumb1','mixamorigLeftHandThumb1'],
  LT2:  ['LeftHandThumb2','mixamorigLeftHandThumb2'],
  LT3:  ['LeftHandThumb3','mixamorigLeftHandThumb3'],
  RT1:  ['RightHandThumb1','mixamorigRightHandThumb1'],
  RT2:  ['RightHandThumb2','mixamorigRightHandThumb2'],
  RT3:  ['RightHandThumb3','mixamorigRightHandThumb3'],

  Spine: ['Spine','Spine1','mixamorigSpine'],
  Neck:  ['Neck','mixamorigNeck'],
  Head:  ['Head','mixamorigHead'],
};

function normBone(n: string): string {
  return n
    .replace(/_\d+$/, '')              // drop exporter suffix e.g. LeftArm_011 -> LeftArm
    .toLowerCase()
    .replace(/mixamorig:?/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function findBone(map: Map<string, THREE.Bone>, key: string): THREE.Bone | null {
  const aliases = BONE_ALIASES[key] ?? [key];
  for (const a of aliases) {
    const b = map.get(a) ?? map.get(normBone(a));
    if (b) return b;
  }
  return null;
}

function boneRest(bone: THREE.Bone): THREE.Euler {
  return (bone as THREE.Bone & { __rest?: THREE.Euler }).__rest ?? bone.rotation;
}

// Apply target as an OFFSET from the bone's rest rotation (rig-agnostic)
function lerpBone(bone: THREE.Bone | null, tx: number, ty: number, tz: number, a: number) {
  if (!bone) return;
  const r = boneRest(bone);
  bone.rotation.x += (r.x + tx - bone.rotation.x) * a;
  bone.rotation.y += (r.y + ty - bone.rotation.y) * a;
  bone.rotation.z += (r.z + tz - bone.rotation.z) * a;
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

  // Auto-fit: normalize the model to a fixed world height and center it,
  // regardless of the GLB's native scale (this avatar is exported huge).
  const fit = useMemo(() => {
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const TARGET_H = 2.2;                        // full-body height in world units
    let baseScale = TARGET_H / size.y;
    if (!isFinite(baseScale) || baseScale <= 0) {
      baseScale = 1;
      center.set(0, 0, 0);
    }
    return { baseScale, center };
  }, [cloned]);

  const bonesRef = useRef<Map<string, THREE.Bone>>(new Map());

  useEffect(() => {
    const map = new Map<string, THREE.Bone>();
    const add = (b: THREE.Bone) => {
      map.set(b.name, b);
      map.set(normBone(b.name), b); // normalized key for fuzzy match
      // Remember rest rotation so poses can be applied as offsets (rig-agnostic)
      const anyB = b as THREE.Bone & { __rest?: THREE.Euler };
      if (!anyB.__rest) anyB.__rest = b.rotation.clone();
    };
    // Authoritative: bones actually used for skinning
    cloned.traverse(obj => {
      const sm = obj as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh && sm.skeleton) sm.skeleton.bones.forEach(add);
    });
    // Fallback: anything flagged as a Bone
    cloned.traverse(obj => { if ((obj as THREE.Bone).isBone) add(obj as THREE.Bone); });
    bonesRef.current = map;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SignAvatar] bones found:', [...map.keys()].join(', '));
    }
  }, [cloned]);

  // ── Clip player (hybrid): real animation clips when available, else procedural ──
  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const actionsRef       = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const clipPlayingRef   = useRef(false);

  useEffect(() => {
    actionsRef.current.clear();
    const entries = Object.entries(SIGN_CLIPS);
    if (entries.length === 0) return; // dormant — pure procedural
    // Build norm->realBoneName map so Mixamo/other clips retarget onto this rig
    const nameByNorm = new Map<string, string>();
    cloned.traverse(o => { if ((o as THREE.Bone).isBone) nameByNorm.set(normBone(o.name), o.name); });
    const loader = new GLTFLoader();
    let cancelled = false;
    entries.forEach(([gloss, url]) => {
      loader.load(url, gltf => {
        if (cancelled || !gltf.animations.length) return;
        const clip = gltf.animations[0];
        // Retarget track node names to this skeleton's actual bone names
        clip.tracks.forEach(t => {
          const dot = t.name.indexOf('.');
          if (dot < 0) return;
          const node = t.name.slice(0, dot);
          const real = nameByNorm.get(normBone(node));
          if (real) t.name = real + t.name.slice(dot);
        });
        const action = mixer.clipAction(clip);
        action.clampWhenFinished = true;
        action.setLoop(THREE.LoopOnce, 1);
        actionsRef.current.set(gloss.toUpperCase(), action);
      }, undefined, () => {/* ignore clip load error -> procedural fallback */});
    });
    return () => { cancelled = true; };
  }, [cloned, mixer]);

  const stopClip = () => {
    if (currentActionRef.current) { currentActionRef.current.fadeOut(0.12); currentActionRef.current = null; }
    clipPlayingRef.current = false;
  };

  const elapsedRef  = useRef(0);
  const prevIdxRef  = useRef(-1);
  const poseRef     = useRef<FullPose>(NEUTRAL);
  const idleRef     = useRef(0);

  useEffect(() => {
    elapsedRef.current = 0;
    prevIdxRef.current = -1;
    poseRef.current    = NEUTRAL;
    stopClip();
  }, [glossSequence]);

  useFrame((_, delta) => {
    idleRef.current += delta;
    const B = bonesRef.current;
    const alpha = Math.min(0.09 + delta * 2.5, 0.22);

    // Subtle breathing on spine
    const breathe = Math.sin(idleRef.current * 1.1) * 0.008;
    const spine = findBone(B, 'Spine');
    if (spine) spine.rotation.x += (boneRest(spine).x + breathe - spine.rotation.x) * 0.04;

    if (!isPlaying || glossSequence.length === 0) {
      if (clipPlayingRef.current) stopClip();
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
        const action = actionsRef.current.get(glossSequence[activeIdx].gloss.toUpperCase());
        if (action) {
          // real clip available -> play it, skip procedural this gloss
          currentActionRef.current?.fadeOut(0.12);
          action.reset().fadeIn(0.12).play();
          currentActionRef.current = action;
          clipPlayingRef.current = true;
        } else {
          stopClip();
          poseRef.current = resolvePose(glossSequence[activeIdx]);
        }
        onGlossChange?.(activeIdx);
      } else if (ms >= (glossSequence[glossSequence.length - 1]?.endMs ?? 0)) {
        elapsedRef.current = 0;
        prevIdxRef.current = -1;
        poseRef.current    = NEUTRAL;
        stopClip();
        onAnimationComplete?.();
      }
    }

    if (clipPlayingRef.current) {
      mixer.update(delta * playbackSpeed); // clip drives the bones
    } else {
      applyPose(poseRef.current, B, alpha); // procedural fallback
      // Head/neck life while signing — gentle nod + tilt for natural expression
      const nod  = Math.sin(idleRef.current * 2.3) * 0.05;
      const tilt = Math.sin(idleRef.current * 1.4) * 0.045;
      const head = findBone(B, 'Head');
      if (head) {
        const hr = boneRest(head);
        head.rotation.x += (hr.x + 0.05 + nod - head.rotation.x) * 0.09;
        head.rotation.z += (hr.z + tilt - head.rotation.z) * 0.09;
      }
      const neck = findBone(B, 'Neck');
      if (neck) {
        const nr = boneRest(neck);
        neck.rotation.x += (nr.x + nod * 0.5 - neck.rotation.x) * 0.06;
      }
    }
  });

  // scale = user zoom multiplier (~1). Normalize, then re-center the bbox at origin,
  // biased slightly downward so the head/torso/hands sit in frame.
  const s = fit.baseScale * scale;
  return (
    <primitive
      object={cloned}
      scale={s}
      position={[-fit.center.x * s, -fit.center.y * s - 0.15, -fit.center.z * s]}
    />
  );
}

// ─── Bone animation ───────────────────────────────────────────────────────────
const MAX_PROX = 1.1; // radians, finger proximal curl
const MAX_MID  = 0.85;
const MAX_DIST = 0.7; // distal (3rd) joint curl — adds natural finger articulation

function applyPose(pose: FullPose, B: Map<string, THREE.Bone>, a: number) {
  const { L, R } = pose;

  // Arms
  lerpBone(findBone(B,'LeftArm'),     L.upper[0], L.upper[1], L.upper[2], a);
  lerpBone(findBone(B,'RightArm'),    R.upper[0], R.upper[1], R.upper[2], a);
  lerpBone(findBone(B,'LeftForeArm'), L.lower[0], L.lower[1], L.lower[2], a);
  lerpBone(findBone(B,'RightForeArm'),R.lower[0], R.lower[1], R.lower[2], a);
  lerpBone(findBone(B,'LeftHand'),    L.wrist[0], L.wrist[1], L.wrist[2], a);
  lerpBone(findBone(B,'RightHand'),   R.wrist[0], R.wrist[1], R.wrist[2], a);

  // Left fingers [index, middle, ring, pinky] — proximal, mid, distal joints
  const lf = L.hand.fingers;
  lerpBoneX(findBone(B,'LI1'), -lf[0]*MAX_PROX, a); lerpBoneX(findBone(B,'LI2'), -lf[0]*MAX_MID, a); lerpBoneX(findBone(B,'LI3'), -lf[0]*MAX_DIST, a);
  lerpBoneX(findBone(B,'LM1'), -lf[1]*MAX_PROX, a); lerpBoneX(findBone(B,'LM2'), -lf[1]*MAX_MID, a); lerpBoneX(findBone(B,'LM3'), -lf[1]*MAX_DIST, a);
  lerpBoneX(findBone(B,'LR1'), -lf[2]*MAX_PROX, a); lerpBoneX(findBone(B,'LR2'), -lf[2]*MAX_MID, a); lerpBoneX(findBone(B,'LR3'), -lf[2]*MAX_DIST, a);
  lerpBoneX(findBone(B,'LP1'), -lf[3]*MAX_PROX, a); lerpBoneX(findBone(B,'LP2'), -lf[3]*MAX_MID, a); lerpBoneX(findBone(B,'LP3'), -lf[3]*MAX_DIST, a);
  lerpBoneX(findBone(B,'LT1'), L.hand.thumb*0.5 - 0.1, a);
  lerpBoneX(findBone(B,'LT2'), L.hand.thumb*0.4, a);
  lerpBoneX(findBone(B,'LT3'), L.hand.thumb*0.3, a);

  // Right fingers
  const rf = R.hand.fingers;
  lerpBoneX(findBone(B,'RI1'), -rf[0]*MAX_PROX, a); lerpBoneX(findBone(B,'RI2'), -rf[0]*MAX_MID, a); lerpBoneX(findBone(B,'RI3'), -rf[0]*MAX_DIST, a);
  lerpBoneX(findBone(B,'RM1'), -rf[1]*MAX_PROX, a); lerpBoneX(findBone(B,'RM2'), -rf[1]*MAX_MID, a); lerpBoneX(findBone(B,'RM3'), -rf[1]*MAX_DIST, a);
  lerpBoneX(findBone(B,'RR1'), -rf[2]*MAX_PROX, a); lerpBoneX(findBone(B,'RR2'), -rf[2]*MAX_MID, a); lerpBoneX(findBone(B,'RR3'), -rf[2]*MAX_DIST, a);
  lerpBoneX(findBone(B,'RP1'), -rf[3]*MAX_PROX, a); lerpBoneX(findBone(B,'RP2'), -rf[3]*MAX_MID, a); lerpBoneX(findBone(B,'RP3'), -rf[3]*MAX_DIST, a);
  lerpBoneX(findBone(B,'RT1'), R.hand.thumb*0.5 - 0.1, a);
  lerpBoneX(findBone(B,'RT2'), R.hand.thumb*0.4, a);
  lerpBoneX(findBone(B,'RT3'), R.hand.thumb*0.3, a);
}

function lerpBoneX(bone: THREE.Bone | null, target: number, a: number) {
  if (!bone) return;
  const rx = boneRest(bone).x;
  bone.rotation.x += (rx + target - bone.rotation.x) * a;
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
// Local human avatar (bundled, reliable, full finger bones). Poses are applied as
// OFFSETS from each bone's rest rotation (see applyPose), so this works regardless
// of the rig's bind pose. Override with VITE_AVATAR_URL to use a different model.
const DEFAULT_AVATAR_URL = '/ready_player_me_male_avatar__vrchatgame.glb';
const AVATAR_URL = import.meta.env.VITE_AVATAR_URL || DEFAULT_AVATAR_URL;

// ─── Sign animation clips (drop-in, optional) ────────────────────────────────
// Hybrid signing: if a gloss has a real animation clip here, play the clip
// (accurate motion); otherwise fall back to the procedural pose engine below.
// Clips must target an RPM/Mixamo-compatible skeleton (same bone names) so they
// retarget cleanly onto this avatar. Add entries as you acquire clips, e.g.:
//   HELLO: '/clips/hello.glb',
// Free source: mixamo.com (download "With Skin" off / animation-only FBX -> GLB).
export const SIGN_CLIPS: Record<string, string> = {
  // empty for now — every gloss uses the procedural engine until clips are added
};

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
// scale is now a zoom multiplier applied on top of auto-fit normalization
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;
const STEP      = 0.1;
const BASE_SCALE = 1.0;

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
      <Canvas camera={{ position: [0, 0.1, 4.8], fov: 30 }} gl={{ antialias: true }}>
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
          target={[0, 0.1, 0]}
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

