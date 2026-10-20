import type { ReactNode } from 'react';

/* The hand the cube robots are drawn in: seeded jitter, so a frame is the same
   drawing on every render, and three frames that boil like stop motion. */

export type P = [number, number];
export type Rough = (k: number) => string;

/** The number of hand-drawn frames each outline boils through. */
export const FRAMES = [0, 1, 2] as const;

/** A small seeded PRNG. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const f = (n: number) => Math.round(n * 10) / 10;
/** Point `i` of a ring of points, wrapping. */
const at = (pts: P[], i: number): P =>
  pts[((i % pts.length) + pts.length) % pts.length] as P;

/** A line through `points`, drawn by hand: each corner a little off, each edge
 *  bowed through a jittered midpoint. */
export function inked(
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
export function ring(
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
export const poly = (pts: P[]) =>
  `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`;

/** The three hand-drawn frames of one outline, swapped on steps by the CSS. */
export function Boil({ children }: { children: (k: number) => ReactNode }) {
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

/** The roughening filters the frames reference, one per frame. */
export function RoughDefs({ uid, scale = 1.6 }: { uid: string; scale?: number }) {
  return (
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
            scale={scale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      ))}
    </defs>
  );
}

export const roughOf =
  (uid: string): Rough =>
  (k) =>
    `url(#cb-rough-${uid}-${k})`;
