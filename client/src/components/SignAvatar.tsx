import { type RefObject, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

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

type JA = [number, number, number];

interface HandShape {
  fingers: [number, number, number, number];
  thumb: number;
  wristY?: number;
}

interface ArmPose {
  upper: JA;
  lower: JA;
  wrist: JA;
  hand: HandShape;
}

interface FullPose {
  L: ArmPose;
  R: ArmPose;
}

const OPEN: HandShape  = { fingers: [0,   0,   0,   0  ], thumb: 0.5 };
const FIST: HandShape  = { fingers: [1,   1,   1,   1  ], thumb: 0.3 };

const NEUTRAL: FullPose = {
  L: { upper:[0.05,0, 0.45], lower:[0,0,0], wrist:[0,0,0], hand:OPEN },
  R: { upper:[0.05,0,-0.45], lower:[0,0,0], wrist:[0,0,0], hand:OPEN },
};

const INDEX: HandShape = { fingers:[1,1,1,0], thumb:1 };
const TWO:   HandShape = { fingers:[1,1,0,0], thumb:1 };
const CLAW:  HandShape = { fingers:[0.5,0.5,0.5,0.5], thumb:0.3 };
const PINCH: HandShape = { fingers:[0.5,0.5,0.5,0.5], thumb:0.2 };
const FLAT:  HandShape = { fingers:[0,0,0,0], thumb:0.8 };

const NAMED_POSES: Record<string, FullPose> = {
  HELLO:    { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],     hand:OPEN },
              R:{ upper:[-1.3,0.1,-0.3],lower:[-0.5,0,0.3],wrist:[0.3,0.1,0], hand:FLAT } },
  HI:       { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],     hand:OPEN },
              R:{ upper:[-1.3,0.1,-0.3],lower:[-0.5,0,0.3],wrist:[0.3,0.1,0], hand:FLAT } },
  BYE:      { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],     hand:OPEN },
              R:{ upper:[-1.1,0,-0.4], lower:[-0.3,0,0.2], wrist:[0.4,0.2,0], hand:OPEN } },
  GOODBYE:  { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],     hand:OPEN },
              R:{ upper:[-1.1,0,-0.4], lower:[-0.3,0,0.2], wrist:[0.4,0.2,0], hand:OPEN } },
  'THANK-YOU': { L:{ upper:[0.4,0,0.3],  lower:[-0.8,0,0.2], wrist:[0,0.3,0],  hand:OPEN },
                 R:{ upper:[0.4,0,-0.3], lower:[-0.8,0,-0.2],wrist:[0,-0.3,0], hand:OPEN } },
  THANK:    { L:{ upper:[0.4,0,0.3],  lower:[-0.8,0,0.2], wrist:[0,0.3,0],  hand:OPEN },
              R:{ upper:[0.4,0,-0.3], lower:[-0.8,0,-0.2],wrist:[0,-0.3,0], hand:OPEN } },
  PLEASE:   { L:{ upper:[0.05,0,0.5], lower:[0.2,0,0],     wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.6,-0.1,-0.4],lower:[-0.5,0,0],  wrist:[0.2,0,0],  hand:FLAT } },
  SORRY:    { L:{ upper:[0.6,0,0.2],  lower:[-0.7,0,0.1], wrist:[0.1,0,0],  hand:FIST },
              R:{ upper:[0.6,0,-0.2], lower:[-0.7,0,-0.1],wrist:[0.1,0,0],  hand:FIST } },
  WELCOME:  { L:{ upper:[0.05,0,0.5], lower:[0,0,0],       wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.2,0,-0.6], lower:[-0.4,0,0.2],  wrist:[0,0,0],    hand:OPEN } },
  EXCUSE:   { L:{ upper:[0.3,0,0.4],  lower:[-0.4,0,0.2], wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.3,0,-0.4], lower:[-0.6,0,0],    wrist:[0.1,0,0],  hand:FLAT } },
  I:        { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.5,0,-0.3],  lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:FIST } },
  ME:       { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.5,0,-0.3],  lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:FIST } },
  YOU:      { L:{ upper:[0.05,0,0.45], lower:[0.3,0,0],    wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0,0.5,-0.5],  lower:[0,0,-0.3],   wrist:[0,0,0],    hand:INDEX } },
  WE:       { L:{ upper:[-0.4,0,0.5], lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:INDEX },
              R:{ upper:[-0.4,0,-0.5],lower:[-0.3,0,-0.2],wrist:[0,0,0],    hand:INDEX } },
  THEY:     { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.3,0,-0.7], lower:[0,0,-0.2],   wrist:[0,0,0],    hand:INDEX } },
  WHAT:     { L:{ upper:[-0.8,0,0.3],  lower:[-0.5,0,0.2], wrist:[0.5,0,0],  hand:OPEN },
              R:{ upper:[-0.8,0,-0.3], lower:[-0.5,0,-0.2],wrist:[0.5,0,0],  hand:OPEN } },
  WHERE:    { L:{ upper:[-0.8,0,0.3],  lower:[-0.5,0,0.2], wrist:[0.5,0,0],  hand:OPEN },
              R:{ upper:[-0.8,0,-0.3], lower:[-0.5,0,-0.2],wrist:[0.5,0,0],  hand:OPEN } },
  WHY:      { L:{ upper:[-0.8,0,0.3],  lower:[-0.5,0,0.2], wrist:[0.5,0,0],  hand:OPEN },
              R:{ upper:[-1.0,0.1,-0.3],lower:[-0.5,0,0],  wrist:[0.2,0,0],  hand:CLAW } },
  HOW:      { L:{ upper:[-0.6,0,0.3],  lower:[-0.4,0,0.2], wrist:[0.3,0,0],  hand:FIST },
              R:{ upper:[-0.6,0,-0.3], lower:[-0.4,0,-0.2],wrist:[0.3,0,0],  hand:FIST } },
  WHEN:     { L:{ upper:[0.2,0,0.4],   lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:INDEX },
              R:{ upper:[0.2,0,-0.4],  lower:[-0.5,0,0],   wrist:[0,0,0],    hand:INDEX } },
  WHO:      { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.8,0.1,-0.3],lower:[-0.4,0,0.2],wrist:[0.2,0,0],  hand:INDEX } },
  YES:      { L:{ upper:[-1.5,0,0.2],  lower:[-0.4,0,0],   wrist:[0.2,0,0],  hand:OPEN },
              R:{ upper:[-1.3,0,-0.3], lower:[-0.5,0,0],   wrist:[0.3,0,0],  hand:FIST } },
  NO:       { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.1,0,-0.5],  lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:TWO  } },
  OK:       { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.3,0,-0.4],  lower:[-0.4,0,0.2], wrist:[0,0.2,0],  hand:PINCH } },
  KNOW:     { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.9,0.2,-0.4],lower:[-0.5,0.1,0.2],wrist:[0.1,0,0],hand:FLAT } },
  UNDERSTAND:{ L:{ upper:[0.05,0,0.45], lower:[0,0,0],     wrist:[0,0,0],    hand:OPEN },
               R:{ upper:[-1.1,0.1,-0.3],lower:[-0.4,0,0.2],wrist:[0.2,0,0], hand:INDEX } },
  THINK:    { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-1.0,0.2,-0.3],lower:[-0.4,0,0.1],wrist:[0.1,0,0],  hand:INDEX } },
  LOVE:     { L:{ upper:[0.6,0,0.3],   lower:[-0.6,0,0.1], wrist:[0.1,0,0],  hand:FIST },
              R:{ upper:[0.6,0,-0.3],  lower:[-0.6,0,-0.1],wrist:[0.1,0,0],  hand:FIST } },
  LIKE:     { L:{ upper:[0.5,0,0.3],   lower:[-0.5,0,0.1], wrist:[0.1,0,0],  hand:OPEN },
              R:{ upper:[0.5,0,-0.3],  lower:[-0.7,0,0],   wrist:[0.2,0,0],  hand:PINCH } },
  WANT:     { L:{ upper:[0.2,0,0.5],   lower:[-0.4,0,0.2], wrist:[0,0,0],    hand:CLAW },
              R:{ upper:[0.2,0,-0.5],  lower:[-0.4,0,-0.2],wrist:[0,0,0],    hand:CLAW } },
  NEED:     { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0,0.3,-0.5],  lower:[-0.5,0,0],   wrist:[0.3,0,0],  hand:INDEX } },
  HELP:     { L:{ upper:[0.3,0,0.4],   lower:[-0.5,0,0.2], wrist:[0,0,0],    hand:FIST },
              R:{ upper:[0.3,0,-0.5],  lower:[-0.3,0,0],   wrist:[0,0,0],    hand:FLAT } },
  WORK:     { L:{ upper:[0.2,0,0.4],   lower:[-0.5,0,0.2], wrist:[0.2,0,0],  hand:FIST },
              R:{ upper:[0.2,0,-0.4],  lower:[-0.5,0,-0.2],wrist:[0.2,0,0],  hand:FIST } },
  LEARN:    { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.7,0.1,-0.3],lower:[-0.5,0,0.2],wrist:[0.1,0,0],  hand:FLAT } },
  GO:       { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0,0.2,-0.6],  lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:INDEX } },
  COME:     { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.2,0,-0.5], lower:[-0.4,0,0.1], wrist:[0,0,0],    hand:INDEX } },
  SEE:      { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.8,0.2,-0.4],lower:[-0.3,0,0.2],wrist:[0.1,0,0],  hand:TWO  } },
  HEAR:     { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-1.1,0.1,-0.3],lower:[-0.4,0,0.2],wrist:[0,0,0],    hand:INDEX } },
  TELL:     { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.8,0.1,-0.3],lower:[-0.4,0,0.2],wrist:[0.1,0.1,0],hand:INDEX } },
  GIVE:     { L:{ upper:[0.2,0,0.4],   lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:FLAT },
              R:{ upper:[0.2,0,-0.5],  lower:[-0.4,0,0],   wrist:[0,0,0],    hand:FLAT } },
  WAIT:     { L:{ upper:[0.3,0,0.5],   lower:[-0.5,0,0.2], wrist:[0.2,0,0],  hand:OPEN },
              R:{ upper:[0.3,0,-0.5],  lower:[-0.5,0,-0.2],wrist:[0.2,0,0],  hand:OPEN } },
  STOP:     { L:{ upper:[0.2,0,0.5],   lower:[-0.4,0,0.2], wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.2,0,-0.5],  lower:[-0.6,0,0],   wrist:[0.3,0,0],  hand:FLAT } },
  START:    { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.2,0,-0.5],  lower:[-0.4,0,0.1], wrist:[0,0.5,0],  hand:INDEX } },
  FINISH:   { L:{ upper:[0.2,0,0.4],   lower:[-0.4,0,0.2], wrist:[0.3,0,0],  hand:OPEN },
              R:{ upper:[0.2,0,-0.4],  lower:[-0.4,0,-0.2],wrist:[0.3,0,0],  hand:OPEN } },
  NAME:     { L:{ upper:[0.05,0,0.45], lower:[0.3,0,0],    wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-1.0,0.2,-0.3],lower:[-0.6,0.1,0.2],wrist:[0.2,-0.2,0],hand:TWO } },
  FAMILY:   { L:{ upper:[0.4,0,0.4],   lower:[-0.5,0,0.2], wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.4,0,-0.4],  lower:[-0.5,0,-0.2],wrist:[0,0,0],    hand:OPEN } },
  FRIEND:   { L:{ upper:[0.3,0,0.5],   lower:[-0.5,0,0.2], wrist:[0,0,0],    hand:INDEX },
              R:{ upper:[0.3,0,-0.5],  lower:[-0.5,0,-0.2],wrist:[0,0,0],    hand:INDEX } },
  HOME:     { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.8,0.1,-0.4],lower:[-0.4,0,0.2],wrist:[0.2,0,0],  hand:PINCH } },
  SCHOOL:   { L:{ upper:[0.3,0,0.4],   lower:[-0.5,0,0.2], wrist:[0,0.3,0],  hand:OPEN },
              R:{ upper:[0.3,0,-0.4],  lower:[-0.5,0,-0.2],wrist:[0,-0.3,0], hand:OPEN } },
  FOOD:     { L:{ upper:[0.2,0,0.4],   lower:[-0.5,0,0.2], wrist:[0.1,0,0],  hand:OPEN },
              R:{ upper:[-0.4,0,-0.3], lower:[-1.0,0,0],   wrist:[0.2,0,0],  hand:CLAW } },
  WATER:    { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.8,0.1,-0.3],lower:[-0.4,0,0.2],wrist:[0.2,0,0],  hand:{ fingers:[1,0,0,0], thumb:1 } } },
  MONEY:    { L:{ upper:[0.2,0,0.4],   lower:[-0.4,0,0.2], wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.2,0,-0.5],  lower:[-0.5,0,0],   wrist:[0,0,0],    hand:PINCH } },
  TIME:     { L:{ upper:[0.2,0,0.5],   lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.2,0,-0.4],  lower:[-0.5,0,0],   wrist:[0,0,0],    hand:INDEX } },
  DAY:      { L:{ upper:[-0.3,0,0.8],  lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.3,0,-0.4], lower:[0,0,0],      wrist:[0,0,0],    hand:INDEX } },
  TODAY:    { L:{ upper:[-0.3,0,0.8],  lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.3,0,-0.4], lower:[0,0,0],      wrist:[0,0,0],    hand:INDEX } },
  NOW:      { L:{ upper:[0.2,0,0.5],   lower:[-0.6,0,0.2], wrist:[0.3,0,0],  hand:OPEN },
              R:{ upper:[0.2,0,-0.5],  lower:[-0.6,0,-0.2],wrist:[0.3,0,0],  hand:OPEN } },
  GOOD:     { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.4,0,-0.3],  lower:[-0.7,0,0.1], wrist:[0,0,0],    hand:FLAT } },
  BAD:      { L:{ upper:[0.05,0,0.45], lower:[0,0,0],      wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.4,0,-0.3],  lower:[-0.7,0,0.1], wrist:[0.3,0,0],  hand:FLAT } },
  HAPPY:    { L:{ upper:[0.4,0,0.3],   lower:[-0.6,0,0.1], wrist:[0.1,0,0],  hand:OPEN },
              R:{ upper:[0.4,0,-0.3],  lower:[-0.6,0,-0.1],wrist:[0.1,0,0],  hand:OPEN } },
  SAD:      { L:{ upper:[0.5,0,0.3],   lower:[-0.5,0,0.1], wrist:[0.2,0,0],  hand:OPEN },
              R:{ upper:[0.5,0,-0.3],  lower:[-0.5,0,-0.1],wrist:[0.2,0,0],  hand:OPEN } },
  BIG:      { L:{ upper:[0.1,0,0.6],   lower:[-0.4,0,0.3], wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.1,0,-0.6],  lower:[-0.4,0,-0.3],wrist:[0,0,0],    hand:OPEN } },
  SMALL:    { L:{ upper:[0.2,0,0.5],   lower:[-0.6,0,0.2], wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[0.2,0,-0.5],  lower:[-0.6,0,-0.2],wrist:[0,0,0],    hand:OPEN } },
  _pool0:   { L:{ upper:[-0.2,0,1.3],  lower:[-0.3,0,0.2], wrist:[0,0,0],    hand:OPEN },
              R:{ upper:[-0.2,0,-1.3], lower:[-0.3,0,-0.2],wrist:[0,0,0],    hand:OPEN } },
  _pool1:   { L:{ upper:[-0.5,0,0.5],  lower:[-0.4,0,0.2], wrist:[0.2,0,0],  hand:FIST },
              R:{ upper:[-0.5,0,-0.5], lower:[-0.4,0,-0.2],wrist:[0.2,0,0],  hand:FIST } },
  _pool2:   { L:{ upper:[0.3,0,0.6],   lower:[-0.5,0,0.3], wrist:[0,0.2,0],  hand:OPEN },
              R:{ upper:[0.3,0,-0.6],  lower:[-0.5,0,-0.3],wrist:[0,-0.2,0], hand:OPEN } },
  _pool3:   { L:{ upper:[-0.8,0,0.4],  lower:[-0.3,0,0.2], wrist:[0.1,0,0],  hand:CLAW },
              R:{ upper:[-0.8,0,-0.4], lower:[-0.3,0,-0.2],wrist:[0.1,0,0],  hand:CLAW } },
  _pool4:   { L:{ upper:[0.6,0,0.3],   lower:[-0.4,0,0.1], wrist:[0,0.3,0],  hand:PINCH },
              R:{ upper:[0.1,0,-0.5],  lower:[-0.6,0,0],   wrist:[0,-0.2,0], hand:INDEX } },
};

const _POOL_KEYS = Object.keys(NAMED_POSES).filter(k => k.startsWith('_pool'));
const _POOL: FullPose[] = _POOL_KEYS.map(k => NAMED_POSES[k]);

const FS_ARM: Pick<ArmPose, 'upper'|'lower'|'wrist'> = {
  upper: [0.25, 0, -0.55],
  lower: [-0.75, 0, 0],
  wrist: [0, 0, 0],
};

const LETTER_SHAPES: Record<string, HandShape> = {
  A: { fingers:[1,1,1,1],    thumb:0.3 },
  B: { fingers:[0,0,0,0],    thumb:1   },
  C: { fingers:[0.4,0.4,0.4,0.4], thumb:0.4 },
  D: { fingers:[1,1,1,0],    thumb:0.5 },
  E: { fingers:[0.8,0.8,0.8,0.8], thumb:1 },
  F: { fingers:[0,0,0,1],    thumb:0, wristY:0.2 },
  G: { fingers:[1,1,1,0],    thumb:0, wristY:-0.6 },
  H: { fingers:[1,1,0,0],    thumb:1, wristY:-0.6 },
  I: { fingers:[0,1,1,1],    thumb:1   },
  J: { fingers:[0,1,1,1],    thumb:1   },
  K: { fingers:[1,1,0,0],    thumb:0.5 },
  L: { fingers:[1,1,1,0],    thumb:0   },
  M: { fingers:[0.5,0.5,0.5,0.5], thumb:1 },
  N: { fingers:[1,0.5,0.5,0.5], thumb:1 },
  O: { fingers:[0.5,0.5,0.5,0.5], thumb:0.3 },
  P: { fingers:[1,1,0,0],    thumb:0.5, wristY:-0.3 },
  Q: { fingers:[1,1,1,0],    thumb:0,   wristY:-0.4 },
  R: { fingers:[1,1,0,0],    thumb:1   },
  S: { fingers:[1,1,1,1],    thumb:0   },
  T: { fingers:[1,1,1,1],    thumb:0.5 },
  U: { fingers:[1,1,0,0],    thumb:1   },
  V: { fingers:[1,1,0,0],    thumb:1, wristY:0.3 },
  W: { fingers:[1,0,0,0],    thumb:1   },
  X: { fingers:[1,1,1,0.6],  thumb:1   },
  Y: { fingers:[0,1,1,1],    thumb:0   },
  Z: { fingers:[1,1,1,0],    thumb:1   },
  '0': { fingers:[0.5,0.5,0.5,0.5], thumb:0.3 },
  '1': { fingers:[1,1,1,0],  thumb:1   },
  '2': { fingers:[1,1,0,0],  thumb:1   },
  '3': { fingers:[1,0,0,0],  thumb:0   },
  '4': { fingers:[0,0,0,0],  thumb:1   },
  '5': { fingers:[0,0,0,0],  thumb:0   },
  '6': { fingers:[0,0,0,0.6],thumb:0.3 },
  '7': { fingers:[0,0,0.6,0.6],thumb:0.3 },
  '8': { fingers:[0,0.6,0.6,0.6],thumb:0.3 },
  '9': { fingers:[0.6,0.6,0.6,0.6],thumb:0.3 },
};

function getLetterPose(char: string): FullPose {
  const shape = LETTER_SHAPES[char.toUpperCase()] ?? LETTER_SHAPES.A;
  return {
    L: { ...NEUTRAL.L },
    R: { ...FS_ARM, wrist: [0, shape.wristY ?? 0, 0], hand: shape },
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function resolvePose(entry: GlossEntry): FullPose {
  if (entry.fingerspell && entry.gloss.length === 1) return getLetterPose(entry.gloss);
  const g = entry.gloss.toUpperCase();
  if (NAMED_POSES[g]) return NAMED_POSES[g];
  for (const key of Object.keys(NAMED_POSES)) {
    if (key.startsWith('_')) continue;
    if (g.includes(key) || key.includes(g)) return NAMED_POSES[key];
  }
  return _POOL[hashStr(g) % _POOL.length];
}

function lerpGroup(ref: RefObject<THREE.Group | null>, target: JA, a: number) {
  if (!ref.current) return;
  const r = ref.current.rotation;
  r.x += (target[0] - r.x) * a;
  r.y += (target[1] - r.y) * a;
  r.z += (target[2] - r.z) * a;
}

function lerpGroupX(group: THREE.Group | null, target: number, a: number) {
  if (!group) return;
  group.rotation.x += (target - group.rotation.x) * a;
}

function AvatarScene({
  glossSequence,
  isPlaying,
  playbackSpeed,
  onGlossChange,
  onAnimationComplete,
}: {
  glossSequence: GlossEntry[];
  isPlaying: boolean;
  playbackSpeed: number;
  onGlossChange?: (i: number) => void;
  onAnimationComplete?: () => void;
}) {
  const lUpper = useRef<THREE.Group>(null);
  const rUpper = useRef<THREE.Group>(null);
  const lLower = useRef<THREE.Group>(null);
  const rLower = useRef<THREE.Group>(null);
  const lWrist = useRef<THREE.Group>(null);
  const rWrist = useRef<THREE.Group>(null);
  const lFingers = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const rFingers = useRef<(THREE.Group | null)[]>([null, null, null, null]);
  const lThumb   = useRef<THREE.Group | null>(null);
  const rThumb   = useRef<THREE.Group | null>(null);
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
    const breathe = Math.sin(idleRef.current * 1.1) * 0.012;
    const alpha = Math.min(0.09 + delta * 2.5, 0.22);

    if (!isPlaying || glossSequence.length === 0) {
      lerpGroup(lUpper, [NEUTRAL.L.upper[0]+breathe, NEUTRAL.L.upper[1], NEUTRAL.L.upper[2]], 0.04);
      lerpGroup(rUpper, [NEUTRAL.R.upper[0]+breathe, NEUTRAL.R.upper[1], NEUTRAL.R.upper[2]], 0.04);
      lerpGroup(lLower, NEUTRAL.L.lower, 0.04);
      lerpGroup(rLower, NEUTRAL.R.lower, 0.04);
      lerpGroup(lWrist, NEUTRAL.L.wrist, 0.04);
      lerpGroup(rWrist, NEUTRAL.R.wrist, 0.04);
      applyFingers(NEUTRAL.L.hand, NEUTRAL.R.hand, 0.04);
      return;
    }

    elapsedRef.current += delta * 1000 * playbackSpeed;
    const ms = elapsedRef.current;
    let activeIdx = -1;
    for (let i = 0; i < glossSequence.length; i++) {
      if (ms >= glossSequence[i].startMs && ms < glossSequence[i].endMs) {
        activeIdx = i; break;
      }
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

    const p = poseRef.current;
    lerpGroup(lUpper, p.L.upper, alpha);
    lerpGroup(rUpper, p.R.upper, alpha);
    lerpGroup(lLower, p.L.lower, alpha);
    lerpGroup(rLower, p.R.lower, alpha);
    lerpGroup(lWrist, p.L.wrist, alpha);
    lerpGroup(rWrist, p.R.wrist, alpha);
    applyFingers(p.L.hand, p.R.hand, alpha);
  });

  function applyFingers(lHand: HandShape, rHand: HandShape, a: number) {
    const MAX_CURL = 1.35;
    for (let i = 0; i < 4; i++) {
      lerpGroupX(lFingers.current[i], -lHand.fingers[i] * MAX_CURL, a);
      lerpGroupX(rFingers.current[i], -rHand.fingers[i] * MAX_CURL, a);
    }
    lerpGroupX(lThumb.current, lHand.thumb * 0.6 - 0.15, a);
    lerpGroupX(rThumb.current, rHand.thumb * 0.6 - 0.15, a);
  }

  const skin  = '#F5CBA7';
  const shirt = '#3B82F6';
  const pants = '#1E293B';
  const shoe  = '#374151';
  const hair  = '#3B2314';
  const FX: [number, number, number, number] = [-0.028, -0.009, 0.009, 0.028];

  return (
    <group position={[0, -0.9, 0]}>
      <mesh position={[0, 1.72, 0]}>
        <sphereGeometry args={[0.185, 28, 28]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[-0.185, 1.72, 0]}>
        <sphereGeometry args={[0.048, 10, 10]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[0.185, 1.72, 0]}>
        <sphereGeometry args={[0.048, 10, 10]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.845, 0]}>
        <sphereGeometry args={[0.193, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={hair} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.49, 0]}>
        <cylinderGeometry args={[0.065, 0.075, 0.18, 14]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[0.44, 0.52, 0.22]} />
        <meshStandardMaterial color={shirt} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[0.38, 0.2, 0.21]} />
        <meshStandardMaterial color={pants} roughness={0.6} />
      </mesh>
      {([-0.11, 0.11] as const).map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.42, 0]}>
            <capsuleGeometry args={[0.072, 0.36, 4, 10]} />
            <meshStandardMaterial color={pants} roughness={0.6} />
          </mesh>
          <mesh position={[x, 0.12, 0]}>
            <capsuleGeometry args={[0.055, 0.28, 4, 10]} />
            <meshStandardMaterial color={pants} roughness={0.6} />
          </mesh>
          <mesh position={[x, -0.06, 0.04]}>
            <boxGeometry args={[0.1, 0.07, 0.18]} />
            <meshStandardMaterial color={shoe} roughness={0.7} />
          </mesh>
        </group>
      ))}
      <group ref={lUpper} position={[-0.24, 1.33, 0]}>
        <mesh position={[0, -0.185, 0]}>
          <capsuleGeometry args={[0.056, 0.26, 4, 10]} />
          <meshStandardMaterial color={shirt} roughness={0.5} />
        </mesh>
        <group ref={lLower} position={[0, -0.37, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.046, 0.22, 4, 10]} />
            <meshStandardMaterial color={skin} roughness={0.6} />
          </mesh>
          <group ref={lWrist} position={[0, -0.285, 0]}>
            <mesh position={[0, -0.05, 0]}>
              <boxGeometry args={[0.09, 0.08, 0.045]} />
              <meshStandardMaterial color={skin} roughness={0.5} />
            </mesh>
            {FX.map((x, i) => (
              <group key={i} ref={el => { lFingers.current[i] = el; }} position={[x, -0.098, 0]}>
                <mesh position={[0, -0.026, 0]}>
                  <capsuleGeometry args={[0.011, 0.038, 3, 6]} />
                  <meshStandardMaterial color={skin} roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.06, 0]}>
                  <capsuleGeometry args={[0.009, 0.026, 3, 6]} />
                  <meshStandardMaterial color={skin} roughness={0.5} />
                </mesh>
              </group>
            ))}
            <group ref={el => { lThumb.current = el; }} position={[-0.052, -0.06, 0]} rotation={[0, 0, 0.85]}>
              <mesh position={[0, -0.025, 0]}>
                <capsuleGeometry args={[0.013, 0.04, 3, 6]} />
                <meshStandardMaterial color={skin} roughness={0.5} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      <group ref={rUpper} position={[0.24, 1.33, 0]}>
        <mesh position={[0, -0.185, 0]}>
          <capsuleGeometry args={[0.056, 0.26, 4, 10]} />
          <meshStandardMaterial color={shirt} roughness={0.5} />
        </mesh>
        <group ref={rLower} position={[0, -0.37, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.046, 0.22, 4, 10]} />
            <meshStandardMaterial color={skin} roughness={0.6} />
          </mesh>
          <group ref={rWrist} position={[0, -0.285, 0]}>
            <mesh position={[0, -0.05, 0]}>
              <boxGeometry args={[0.09, 0.08, 0.045]} />
              <meshStandardMaterial color={skin} roughness={0.5} />
            </mesh>
            {FX.map((x, i) => (
              <group key={i} ref={el => { rFingers.current[i] = el; }} position={[x, -0.098, 0]}>
                <mesh position={[0, -0.026, 0]}>
                  <capsuleGeometry args={[0.011, 0.038, 3, 6]} />
                  <meshStandardMaterial color={skin} roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.06, 0]}>
                  <capsuleGeometry args={[0.009, 0.026, 3, 6]} />
                  <meshStandardMaterial color={skin} roughness={0.5} />
                </mesh>
              </group>
            ))}
            <group ref={el => { rThumb.current = el; }} position={[0.052, -0.06, 0]} rotation={[0, 0, -0.85]}>
              <mesh position={[0, -0.025, 0]}>
                <capsuleGeometry args={[0.013, 0.04, 3, 6]} />
                <meshStandardMaterial color={skin} roughness={0.5} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export function SignAvatar({
  glossSequence = [],
  isPlaying = false,
  playbackSpeed = 1,
  onGlossChange,
  onAnimationComplete,
}: SignAvatarProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl overflow-hidden">
      <Canvas camera={{ position: [0, 0.4, 2.6], fov: 46 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 3]}  intensity={1.2} castShadow />
        <directionalLight position={[-3, 2, -1]} intensity={0.3} color="#bfcfff" />
        <Environment preset="studio" />
        <AvatarScene
          glossSequence={glossSequence}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onGlossChange={onGlossChange}
          onAnimationComplete={onAnimationComplete}
        />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.8}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>
    </div>
  );
}
