import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';

import { SessionAvatar } from 'Shared/SessionAvatar/SessionAvatar';

import './celebration.css';

export type CelebrationVariant = 'install' | 'ready';

export interface CelebrationProps {
  /** Which story it tells. `install`: two cube robots cheer, every service
   *  answered. `ready`: one cube robot cheers beside the first session. */
  variant?: CelebrationVariant;
  /** Rendered width in px; the height follows the 200 x 112 drawing. */
  size?: number;
  className?: string;
}

/**
 * The success moment: hand-inked cube robots wearing session faces, the line
 * boiling like stop motion. They cheer (hop, confetti) once on arrival and on
 * hover; with reduced motion they hold one still frame.
 */

/** How long the arrival cheer lasts before the drawing rests (ms). */
const ARRIVAL_MS = 1500;
/** The number of hand-drawn frames each outline boils through. */
const FRAMES = [0, 1, 2] as const;

export function Celebration({
  variant = 'install',
  size = 184,
  className,
}: CelebrationProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [arriving, setArriving] = useState(true);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setArriving(false), ARRIVAL_MS);
    return () => window.clearTimeout(t);
  }, []);
  const cheering = arriving || hovered;
  const rough = (k: number) => `url(#cb-rough-${uid}-${k})`;
  const art = useMemo(
    () =>
      variant === 'install' ? (
        <Install rough={rough} />
      ) : (
        <Ready rough={rough} />
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, uid],
  );

  return (
    <span
      className={`m-cheer m-cheer--${variant}${cheering ? ' is-cheering' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: Math.round((size * 112) / 200) }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 112" className="m-cheer__svg" fill="none">
        <defs>
          {FRAMES.map((k) => (
            <filter
              key={k}
              id={`cb-rough-${uid}-${k}`}
              x="-5%"
              y="-5%"
              width="110%"
              height="110%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="2"
                seed={3 + k * 11}
                result="n"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="n"
                scale="1.6"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
        </defs>
        {art}
      </svg>
    </span>
  );
}

/* ── the hand ─────────────────────────────────────────────────────────────── */

type P = [number, number];
type Rough = (k: number) => string;

/** A small seeded PRNG, so a frame is the same drawing on every render. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (n: number) => Math.round(n * 10) / 10;
/** Point `i` of a ring of points, wrapping. */
const at = (pts: P[], i: number): P =>
  pts[((i % pts.length) + pts.length) % pts.length] as P;

/** A line through `points`, drawn by hand: each corner a little off, each edge
 *  bowed through a jittered midpoint. */
function inked(
  points: P[],
  closed: boolean,
  r: () => number,
  amp = 0.7,
): string {
  const j = (v: number) => v + (r() * 2 - 1) * amp;
  const pts = points.map(([x, y]) => [j(x), j(y)] as P);
  const n = pts.length;
  let d = `M${f(at(pts, 0)[0])} ${f(at(pts, 0)[1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = at(pts, i);
    const b = at(pts, i + 1);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const bow = (r() * 2 - 1) * amp * Math.min(1.4, len / 14);
    const mx = (a[0] + b[0]) / 2 - ((b[1] - a[1]) / len) * bow;
    const my = (a[1] + b[1]) / 2 + ((b[0] - a[0]) / len) * bow;
    d += `Q${f(mx)} ${f(my)} ${f(b[0])} ${f(b[1])}`;
  }
  return closed ? `${d}Z` : d;
}

/** A hand-drawn ring: points on a wobbling radius, smoothed through. */
function ring(
  cx: number,
  cy: number,
  rad: number,
  r: () => number,
  amp = 0.45,
): string {
  const n = 7;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + r() * 0.3;
    const rr = rad + (r() * 2 - 1) * amp;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as P;
  });
  const mid = (i: number) => {
    const a = at(pts, i);
    const b = at(pts, i + 1);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as P;
  };
  let d = `M${f(mid(n - 1)[0])} ${f(mid(n - 1)[1])}`;
  for (let i = 0; i < n; i++)
    d += `Q${f(at(pts, i)[0])} ${f(at(pts, i)[1])} ${f(mid(i)[0])} ${f(mid(i)[1])}`;
  return `${d}Z`;
}

/** The same shape with no hand in it: the flat fill under the boiling line. */
const poly = (pts: P[]) => `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`;

/** The three hand-drawn frames of one outline, swapped on steps by the CSS. */
function Boil({ children }: { children: (k: number) => ReactNode }) {
  return (
    <>
      {FRAMES.map((k) => (
        <g key={k} className={`m-cheer__frame m-cheer__frame--${k}`}>
          {children(k)}
        </g>
      ))}
    </>
  );
}

/* ── the robot ────────────────────────────────────────────────────────────── */

/** The cube: a 44 x 42 front, 12 x 9 of depth to the upper right. */
const W = 44;
const H = 42;
const DX = 12;
const DY = 9;
const TOP = 52;
/** The face: a session avatar, inset on the front face. */
const FACE = 38;

/** Who each robot is: a session avatar's seed. */
export interface RobotFace {
  seed: number;
}

function Robot({
  x,
  hand,
  face,
  lean,
  rough,
  hop,
}: {
  x: number;
  hand: number;
  face: RobotFace;
  lean: 1 | -1;
  rough: Rough;
  hop: 'a' | 'b';
}) {
  const B = TOP + H;
  const front: P[] = [
    [x, TOP],
    [x + W, TOP],
    [x + W, B],
    [x, B],
  ];
  const top: P[] = [
    [x, TOP],
    [x + DX, TOP - DY],
    [x + W + DX, TOP - DY],
    [x + W, TOP],
  ];
  const side: P[] = [
    [x + W, TOP],
    [x + W + DX, TOP - DY],
    [x + W + DX, B - DY],
    [x + W, B],
  ];
  const silhouette: P[] = [
    [x, TOP],
    [x + DX, TOP - DY],
    [x + W + DX, TOP - DY],
    [x + W + DX, B - DY],
    [x + W, B],
    [x, B],
  ];
  const foot = (fx: number): P[] => [
    [fx, B - 1],
    [fx + 10, B - 1],
    [fx + 10.5, B + 5],
    [fx + 8.5, B + 7.5],
    [fx + 1.5, B + 7.5],
    [fx - 0.5, B + 5],
  ];
  const feet = [foot(x + 7), foot(x + 27)];
  const cx = x + (W + DX) / 2;
  const cy = TOP - DY / 2;
  const antenna: P[] = [
    [cx, cy],
    [cx + 4 * lean, cy - 8.5],
    [cx + 8 * lean, cy - 16],
  ];
  const bobble: P = [cx + 9.5 * lean, cy - 19.5];

  return (
    <g
      className={`m-cheer__bot m-cheer__bot--${hop}`}
      style={{ transformOrigin: `${cx}px ${B + 7.5}px` }}
    >
      <ellipse
        cx={cx}
        cy={B + 9}
        rx={31}
        ry={3.2}
        className="m-cheer__ground"
      />
      {feet.map((p, i) => (
        <path key={i} d={poly(p)} className="m-cheer__fill-side" />
      ))}
      <path d={poly(top)} className="m-cheer__fill-top" />
      <path d={poly(front)} className="m-cheer__fill-front" />
      <path d={poly(side)} className="m-cheer__fill-side" />
      <foreignObject
        x={x + (W - FACE) / 2}
        y={TOP + (H - FACE) / 2}
        width={FACE}
        height={FACE}
        className="m-cheer__face"
      >
        <SessionAvatar seed={face.seed} size={FACE} />
      </foreignObject>

      <Boil>
        {(k) => {
          const r = rng(hand * 97 + k * 13 + 1);
          return (
            <g filter={rough(k)} className="m-cheer__line">
              {feet.map((p, i) => (
                <path key={i} d={inked(p, true, r, 0.45)} />
              ))}
              <path d={inked(silhouette, true, r)} />
              <path
                d={inked(
                  [
                    [x, TOP],
                    [x + W, TOP],
                    [x + W + DX, TOP - DY],
                  ],
                  false,
                  r,
                  0.6,
                )}
              />
              <path
                d={inked(
                  [
                    [x + W, TOP],
                    [x + W, B],
                  ],
                  false,
                  r,
                  0.6,
                )}
              />
              <path d={inked(antenna, false, r, 0.5)} />
              <path
                d={ring(bobble[0], bobble[1], 4, r)}
                className="m-cheer__bobble"
              />
            </g>
          );
        }}
      </Boil>
    </g>
  );
}

/* ── the confetti ─────────────────────────────────────────────────────────── */

type Bit = {
  kind: 'spark' | 'squig' | 'dash' | 'ring';
  x: number;
  y: number;
  s?: number;
  a?: number;
};

/** One piece, drawn in the same hand; it pops out of `from` when they cheer. */
function Piece({
  bit,
  from,
  i,
  rough,
}: {
  bit: Bit;
  from: P;
  i: number;
  rough: Rough;
}) {
  const r = rng(i * 31 + 7);
  const { x, y } = bit;
  const s = bit.s ?? 4;
  let d: string;
  let cls = 'm-cheer__line';
  if (bit.kind === 'spark') {
    const k = s * 0.3;
    d = inked(
      [
        [x, y - s],
        [x + k, y - k],
        [x + s, y],
        [x + k, y + k],
        [x, y + s],
        [x - k, y + k],
        [x - s, y],
        [x - k, y - k],
      ],
      true,
      r,
      0.25,
    );
    cls = 'm-cheer__line m-cheer__spark';
  } else if (bit.kind === 'squig') {
    d = inked(
      [
        [x - 5, y + 1.5],
        [x - 2, y - 1.5],
        [x + 1, y + 1.5],
        [x + 4, y - 1.5],
      ],
      false,
      r,
      0.35,
    );
  } else if (bit.kind === 'dash') {
    const a = ((bit.a ?? 0) * Math.PI) / 180;
    d = inked(
      [
        [x - Math.cos(a) * 2.6, y - Math.sin(a) * 2.6],
        [x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6],
      ],
      false,
      r,
      0.3,
    );
  } else {
    d = ring(x, y, s, r, 0.3);
  }
  const style = {
    transformOrigin: `${x}px ${y}px`,
    '--dx': `${f(from[0] - x)}px`,
    '--dy': `${f(from[1] - y)}px`,
    '--i': i,
  } as CSSProperties;
  return (
    <g className="m-cheer__bit" style={style}>
      <path d={d} className={cls} filter={rough(0)} />
    </g>
  );
}

function Confetti({
  bits,
  from,
  rough,
}: {
  bits: Bit[];
  from: P;
  rough: Rough;
}) {
  return (
    <g className="m-cheer__confetti">
      {bits.map((b, i) => (
        <Piece key={i} bit={b} from={from} i={i} rough={rough} />
      ))}
    </g>
  );
}

/* ── the two stories ──────────────────────────────────────────────────────── */

const INSTALL_BITS: Bit[] = [
  { kind: 'spark', x: 99, y: 15, s: 5.5 },
  { kind: 'squig', x: 84, y: 24 },
  { kind: 'squig', x: 115, y: 24 },
  { kind: 'dash', x: 88, y: 8, a: 55 },
  { kind: 'dash', x: 110, y: 8, a: -55 },
  { kind: 'ring', x: 76, y: 12, s: 2.2 },
  { kind: 'ring', x: 123, y: 13, s: 2.2 },
  { kind: 'spark', x: 66, y: 8, s: 3 },
  { kind: 'spark', x: 133, y: 7, s: 3 },
  { kind: 'dash', x: 16, y: 38, a: 40 },
  { kind: 'dash', x: 185, y: 36, a: -40 },
];

/** install: two robots side by side, every service answered. */
function Install({ rough }: { rough: Rough }) {
  return (
    <>
      <Robot
        x={28}
        hand={1}
        face={{ seed: 3 }}
        lean={1}
        rough={rough}
        hop="a"
      />
      <Robot
        x={116}
        hand={2}
        face={{ seed: 8 }}
        lean={-1}
        rough={rough}
        hop="b"
      />
      <Confetti bits={INSTALL_BITS} from={[99, 32]} rough={rough} />
    </>
  );
}

const READY_BITS: Bit[] = [
  { kind: 'spark', x: 96, y: 18, s: 5.5 },
  { kind: 'squig', x: 82, y: 28 },
  { kind: 'dash', x: 108, y: 30, a: -50 },
  { kind: 'ring', x: 70, y: 12, s: 2.2 },
  { kind: 'spark', x: 110, y: 9, s: 3 },
  { kind: 'spark', x: 182, y: 36, s: 3 },
  { kind: 'dash', x: 172, y: 30, a: -40 },
  { kind: 'ring', x: 14, y: 40, s: 2 },
];

/** ready: one robot beside the first session, on a hand-drawn card. */
function Ready({ rough }: { rough: Rough }) {
  const card: P[] = [
    [112, 50],
    [115, 46],
    [176, 46],
    [179, 50],
    [179, 94],
    [176, 98],
    [115, 98],
    [112, 94],
  ];
  const play: P[] = [
    [141, 60],
    [141, 74],
    [153, 67],
  ];
  return (
    <>
      <g className="m-cheer__card">
        <ellipse
          cx={146}
          cy={103}
          rx={38}
          ry={3.2}
          className="m-cheer__ground"
        />
        <path
          d={poly(card.map(([x, y]) => [x + 3.5, y + 3.5] as P))}
          className="m-cheer__fill-side"
        />
        <path d={poly(card)} className="m-cheer__fill-top" />
        <path d={poly(play)} className="m-cheer__fill-accent" />
        <Boil>
          {(k) => {
            const r = rng(500 + k * 13);
            return (
              <g filter={rough(k)} className="m-cheer__line">
                <path d={inked(card, true, r, 0.6)} />
                <path d={inked(play, true, r, 0.4)} />
                <path
                  d={inked(
                    [
                      [122, 86],
                      [170, 86],
                    ],
                    false,
                    r,
                    0.5,
                  )}
                />
                <path
                  d={ring(136, 86, 2.6, r, 0.3)}
                  className="m-cheer__bobble"
                />
              </g>
            );
          }}
        </Boil>
      </g>
      <Robot
        x={30}
        hand={3}
        face={{ seed: 5 }}
        lean={1}
        rough={rough}
        hop="a"
      />
      <Confetti bits={READY_BITS} from={[98, 38]} rough={rough} />
    </>
  );
}
