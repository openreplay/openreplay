import { SessionAvatar } from '@/ui/data/SessionAvatar';
import { type AvatarFace, hueIndexFor } from '@/ui/data/avatar';
import { type CSSProperties, type ReactNode, useId, useState } from 'react';

import { FRAMES, type P, inked, poly, ring, rng } from './ink';

export type BotShape = 'cube' | 'triangle' | 'sphere';
export type PropSlot = 'antenna' | 'head' | 'side';

export const HELD = 1.35;
export const FOOT = 49.5;
export const TOP_Y: Record<BotShape, number> = {
  cube: -9,
  triangle: -14,
  sphere: -8,
};
export const BOT_W = 56;

export type View = 'flat' | 'turned';
export interface Projection {
  ax: number;
  ay: number;
  cy: number;
  zx: number;
  zy: number;
}
const TH = (32 * Math.PI) / 180;
const PH = (14 * Math.PI) / 180;
export const TURNED: Projection = {
  ax: 0.88,
  ay: -Math.sin(TH) * Math.sin(PH),
  cy: Math.cos(PH),
  zx: -Math.sin(TH),
  zy: -Math.cos(TH) * Math.sin(PH),
};
export const proj3 = (
  v: Projection,
  depth: number,
  X: number,
  Y: number,
  Z: number,
): P => [X * v.ax + Z * depth * v.zx, Y * v.cy + X * v.ay + Z * depth * v.zy];
export function affineOf([a, b, c]: [P, P, P], [A, B, C]: [P, P, P]): string {
  const m = (u: number[]): number =>
    u[0]! * (u[4]! * u[8]! - u[5]! * u[7]!) -
    u[1]! * (u[3]! * u[8]! - u[5]! * u[6]!) +
    u[2]! * (u[3]! * u[7]! - u[4]! * u[6]!);
  const det = m([a[0], a[1], 1, b[0], b[1], 1, c[0], c[1], 1]);
  const solve = (p: number, q: number, r: number) => ({
    k1: m([p, a[1], 1, q, b[1], 1, r, c[1], 1]) / det,
    k2: m([a[0], p, 1, b[0], q, 1, c[0], r, 1]) / det,
    k3: m([a[0], a[1], p, b[0], b[1], q, c[0], c[1], r]) / det,
  });
  const x = solve(A[0], B[0], C[0]);
  const y = solve(A[1], B[1], C[1]);
  const f = (n: number) => Math.round(n * 10000) / 10000;
  return `matrix(${f(x.k1)} ${f(y.k1)} ${f(x.k2)} ${f(y.k2)} ${f(x.k3)} ${f(y.k3)})`;
}
const DEPTH: Record<BotShape, number> = { cube: 36, triangle: 30, sphere: 0 };

export const freshSeed = () =>
  `armada-${Math.random().toString(36).slice(2, 10)}`;

const STEM: Record<BotShape, P> = {
  cube: [28, -4.5],
  triangle: [25, -13],
  sphere: [28, -7],
};

export const bobbleOf = (shape: BotShape, lean: 1 | -1): P => {
  const [sx, sy] = STEM[shape];
  return [sx + 9.5 * lean, sy - 15];
};

export function slotPlace(
  shape: BotShape,
  slot: PropSlot,
  lean: 1 | -1,
  size = HELD,
): { c: P; pivot: P; tilt: number; string?: [P, P] } {
  const half = 11 * size;
  const tip = bobbleOf(shape, lean);
  if (slot === 'antenna') {
    const c: P = [tip[0] + 7 * lean, tip[1] - 10 - half];
    return {
      c,
      pivot: tip,
      tilt: 6 * lean,
      string: [
        [tip[0], tip[1] - 4],
        [c[0] - 1 * lean, c[1] + half],
      ],
    };
  }
  if (slot === 'head') {
    const [sx, sy] = STEM[shape];
    const c: P =
      shape === 'triangle'
        ? [sx - 4 * lean, sy - half - 2]
        : [sx - 12 * lean, sy - half];
    return { c, pivot: [c[0], c[1] + half], tilt: -4 * lean };
  }
  const c: P =
    lean === 1 ? [-4 - half, FOOT - half] : [BOT_W + 4 + half, FOOT - half];
  return { c, pivot: [c[0], c[1] + half], tilt: 9 * lean };
}

const circle = (cx: number, cy: number, rad: number, n = 24): P[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] as P;
  });

// the sphere's fills stop under its hand-drawn ring, which wobbles inward
const SPHERE_FILL = 23.5;

function crescent(): P[] {
  const out: P[] = [];
  const rad = SPHERE_FILL;
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI;
    out.push([28 + Math.cos(a) * rad, 19 + Math.sin(a) * rad]);
  }
  for (let i = 12; i >= 0; i--) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI;
    out.push([28 + Math.cos(a) * rad * 0.52, 19 + Math.sin(a) * rad]);
  }
  return out;
}

function body(shape: BotShape) {
  if (shape === 'triangle') {
    const apex: P = [25, -14];
    return {
      fills: [
        { d: poly([[44, 42], [56, 33], apex]), cls: 'm-ill__fill-side' },
        { d: poly([[0, 42], [44, 42], apex]), cls: 'm-ill__fill-front' },
      ],
      outline: [[0, 42], [44, 42], [56, 33], apex] as P[] | null,
      edges: [[[44, 42], apex]] as P[][],
      face: {
        x: 0,
        y: -14,
        w: 44,
        h: 56,
        img: 26,
        ix: 9,
        iy: 12,
        front: 'M0 42L44 42L25 -14Z',
      },
      feet: [6, 26],
    };
  }
  if (shape === 'sphere') {
    return {
      fills: [
        { d: poly(circle(28, 19, SPHERE_FILL)), cls: 'm-ill__fill-front' },
        { d: poly(crescent()), cls: 'm-ill__fill-side' },
      ],
      outline: null as P[] | null,
      edges: [] as P[][],
      face: {
        x: 3,
        y: -6,
        w: 50,
        h: 50,
        img: 38,
        ix: 9,
        iy: 0,
        front: 'M3 19a25 25 0 1 0 50 0a25 25 0 1 0 -50 0Z',
      },
      feet: [12, 30],
    };
  }
  return {
    fills: [
      {
        d: poly([
          [0, 0],
          [12, -9],
          [56, -9],
          [44, 0],
        ]),
        cls: 'm-ill__fill-top',
      },
      {
        d: poly([
          [0, 0],
          [44, 0],
          [44, 42],
          [0, 42],
        ]),
        cls: 'm-ill__fill-front',
      },
      {
        d: poly([
          [44, 0],
          [56, -9],
          [56, 33],
          [44, 42],
        ]),
        cls: 'm-ill__fill-side',
      },
    ],
    outline: [
      [0, 0],
      [12, -9],
      [56, -9],
      [56, 33],
      [44, 42],
      [0, 42],
    ] as P[] | null,
    edges: [
      [
        [0, 0],
        [44, 0],
        [56, -9],
      ],
      [
        [44, 0],
        [44, 42],
      ],
    ] as P[][],
    face: {
      x: 0,
      y: 0,
      w: 44,
      h: 42,
      img: 40,
      ix: 2,
      iy: 1,
      front: 'M0 0L44 0L44 42L0 42Z',
    },
    feet: [7, 27],
  };
}

function turnedBody(shape: BotShape) {
  const d = DEPTH[shape];
  const q = (X: number, Y: number, Z: number) => proj3(TURNED, d, X, Y, Z);
  if (shape === 'sphere') return { ...body('sphere'), map: null };
  if (shape === 'triangle') {
    const apex: [number, number, number] = [22, -14, 0.5];
    return {
      fills: [
        {
          d: poly([q(0, 42, 0), q(0, 42, 1), q(...apex)]),
          cls: 'm-ill__fill-side',
        },
        {
          d: poly([q(0, 42, 0), q(44, 42, 0), q(...apex)]),
          cls: 'm-ill__fill-front',
        },
      ],
      outline: [q(44, 42, 0), q(0, 42, 0), q(0, 42, 1), q(...apex)] as
        P[] | null,
      edges: [[q(0, 42, 0), q(...apex)]] as P[][],
      face: {
        x: 0,
        y: -14,
        w: 44,
        h: 56,
        img: 26,
        ix: 9,
        iy: 12,
        front: 'M0 42L44 42L25 -14Z',
      },
      map: [
        [
          [0, 42],
          [44, 42],
          [25, -14],
        ],
        [q(0, 42, 0), q(44, 42, 0), q(...apex)],
      ] as [[P, P, P], [P, P, P]],
      feet: [6, 26],
    };
  }
  return {
    fills: [
      {
        d: poly([q(0, 0, 0), q(0, 0, 1), q(44, 0, 1), q(44, 0, 0)]),
        cls: 'm-ill__fill-top',
      },
      {
        d: poly([q(0, 0, 0), q(44, 0, 0), q(44, 42, 0), q(0, 42, 0)]),
        cls: 'm-ill__fill-front',
      },
      {
        d: poly([q(0, 0, 0), q(0, 0, 1), q(0, 42, 1), q(0, 42, 0)]),
        cls: 'm-ill__fill-side',
      },
    ],
    outline: [
      q(44, 0, 0),
      q(44, 0, 1),
      q(0, 0, 1),
      q(0, 42, 1),
      q(0, 42, 0),
      q(44, 42, 0),
    ] as P[] | null,
    edges: [
      [q(44, 0, 0), q(0, 0, 0), q(0, 0, 1)],
      [q(0, 0, 0), q(0, 42, 0)],
    ] as P[][],
    face: {
      x: 0,
      y: 0,
      w: 44,
      h: 42,
      img: 40,
      ix: 2,
      iy: 1,
      front: 'M0 0L44 0L44 42L0 42Z',
    },
    map: [
      [
        [0, 0],
        [44, 0],
        [0, 42],
      ],
      [q(0, 0, 0), q(44, 0, 0), q(0, 42, 0)],
    ] as [[P, P, P], [P, P, P]],
    feet: [7, 27],
  };
}
const STEM3: Record<BotShape, [number, number, number]> = {
  cube: [22, 0, 0.5],
  triangle: [22, -14, 0.5],
  sphere: [28, -7, 0],
};

export interface BotProps {
  x: number;
  ground: number;
  scale?: number;
  shape?: BotShape;
  lean?: 1 | -1;
  seed?: string;
  hand?: number;
  rough: (k: number) => string;
  held?: ReactNode;
  aura?: ReactNode;
  activeFace?: AvatarFace;
  restFace?: AvatarFace;
  shadow?: boolean;
  beat?: 'a' | 'b';
  view?: View;
  legs?: number | [number, number];
  feet?: boolean;
}

export function Bot({
  x,
  ground,
  scale = 1,
  shape = 'cube',
  lean = 1,
  seed,
  hand = 1,
  rough,
  held,
  aura,
  activeFace = { eyes: 'happy', mouth: 'open' },
  restFace,
  shadow = true,
  beat = 'a',
  view = 'flat',
  legs = 0,
  feet: withFeet = true,
}: BotProps) {
  const gridId = `ill-grid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [fresh] = useState(freshSeed);
  const face = seed ?? fresh;
  const turned = view === 'turned' && shape !== 'sphere';
  const b = turned
    ? turnedBody(shape)
    : { ...body(shape), map: null as [[P, P, P], [P, P, P]] | null };
  const q = (X: number, Y: number): P =>
    turned ? proj3(TURNED, DEPTH[shape], X, Y, 0.03) : [X, Y];
  const legOf = (i: number) => (Array.isArray(legs) ? (legs[i] ?? 0) : legs);
  const foot = (fx: number, i: number): P[] => {
    const L = legOf(i);
    return [
      q(fx, 41),
      q(fx + 10, 41),
      q(fx + 10.5, 47 + L),
      q(fx + 8.5, FOOT + L),
      q(fx + 1.5, FOOT + L),
      q(fx - 0.5, 47 + L),
    ];
  };
  const feet = withFeet ? b.feet.map(foot) : [];
  const [sx, sy] = turned
    ? proj3(TURNED, DEPTH[shape], ...STEM3[shape])
    : STEM[shape];
  const antenna: P[] = [
    [sx, sy],
    [sx + 4 * lean, sy - 7.5],
    [sx + 8 * lean, sy - 12],
  ];
  const bob: P = turned ? [sx + 9.5 * lean, sy - 15] : bobbleOf(shape, lean);
  const faces: { kind: string; part?: AvatarFace }[] = restFace
    ? [
        { kind: 'own', part: restFace },
        { kind: 'cheer', part: activeFace },
      ]
    : [
        { kind: 'own' },
        { kind: 'drift', part: { mouth: 'smile' } },
        { kind: 'blink', part: { eyes: 'soft' } },
        { kind: 'cheer', part: activeFace },
      ];

  return (
    <g transform={`translate(${x} ${ground - FOOT * scale}) scale(${scale})`}>
      {shadow && (
        <ellipse
          cx={28}
          cy={FOOT}
          rx={29}
          ry={2.6 / scale}
          className="m-ill__ground m-ill__bot-shadow"
          style={{ transformOrigin: `28px ${FOOT}px` }}
        />
      )}
      <g
        className={`m-ill__bot m-ill__bot--${beat} m-ill__bot--${shape}`}
        style={
          {
            transformOrigin: `28px ${FOOT}px`,
            // the body takes its face's hue
            '--bot-hue': `${hueIndexFor(face) * 30}deg`,
          } as CSSProperties
        }
      >
        {feet.map((p, i) => (
          <path key={i} d={poly(p)} className="m-ill__fill-side" />
        ))}
        {b.fills.map((fl, i) => (
          <path key={i} d={fl.d} className={fl.cls} />
        ))}
        <g
          transform={turned && b.map ? affineOf(b.map[0], b.map[1]) : undefined}
          style={{ transformOrigin: '0px 0px' }}
        >
          {faces.map(({ kind, part }) => (
            <foreignObject
              key={kind}
              x={b.face.x}
              y={b.face.y}
              width={b.face.w}
              height={b.face.h}
              className={`m-ill__face m-ill__face--${kind} m-ill__face--on-${shape}`}
              style={
                {
                  '--img-x': `${b.face.ix - b.face.x}px`,
                  '--img-y': `${b.face.iy - b.face.y}px`,
                } as CSSProperties
              }
            >
              <SessionAvatar
                seed={face}
                face={part}
                size={b.face.img}
                faceOnly
              />
            </foreignObject>
          ))}
          <FaceGrid
            id={gridId}
            front={b.face.front}
            ix={b.face.ix}
            iy={b.face.iy}
            size={b.face.img}
            box={b.face}
          />
        </g>
        {FRAMES.map((k) => {
          const r = rng(hand * 97 + k * 13 + 1);
          return (
            <g key={k} className={`m-ill__frame m-ill__frame--${k}`}>
              <g filter={rough(k)} className="m-ill__line">
                {feet.map((p, i) => (
                  <path key={i} d={inked(p, true, r, 0.45)} />
                ))}
                {b.outline ? (
                  <path d={inked(b.outline, true, r)} />
                ) : (
                  <path d={ring(28, 19, 25, r, 0.6)} />
                )}
                {b.edges.map((e, i) => (
                  <path key={i} d={inked(e, false, r, 0.6)} />
                ))}
                <path d={inked(antenna, false, r, 0.5)} />
                <path
                  d={ring(bob[0], bob[1], 4, r)}
                  className="m-ill__accent-fill"
                />
              </g>
            </g>
          );
        })}
        {held && <g className="m-ill__held">{held}</g>}
        {aura && <g className="m-ill__bot-aura">{aura}</g>}
      </g>
    </g>
  );
}

function FaceGrid({
  id,
  front,
  ix,
  iy,
  size,
  box,
}: {
  id: string;
  front: string;
  ix: number;
  iy: number;
  size: number;
  box: { x: number; y: number; w: number; h: number };
}) {
  const k = size / 100;
  const pitch = 8.3333 * k;
  return (
    <>
      <defs>
        <pattern
          id={id}
          patternUnits="userSpaceOnUse"
          x={ix}
          y={iy}
          width={pitch}
          height={pitch}
        >
          <rect
            x={0.42 * k}
            y={0.42 * k}
            width={7.5 * k}
            height={7.5 * k}
            rx={1.9 * k}
            className="m-ill__grid-cell"
          />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <path
            d={front}
            transform={`translate(${box.x + box.w / 2} ${box.y + box.h / 2}) scale(0.93) translate(${-(box.x + box.w / 2)} ${-(box.y + box.h / 2)})`}
          />
        </clipPath>
      </defs>
      <path
        d={front}
        fill={`url(#${id})`}
        clipPath={`url(#${id}-clip)`}
        className="m-ill__grid"
      />
    </>
  );
}
