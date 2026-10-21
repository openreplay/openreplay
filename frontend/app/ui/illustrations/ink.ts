export type P = [number, number];

export const FRAMES = [0, 1, 2] as const;

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

export const at = (pts: P[], i: number): P =>
  pts[((i % pts.length) + pts.length) % pts.length] as P;

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

export const poly = (pts: P[]) =>
  `M${pts.map(([x, y]) => `${x} ${y}`).join('L')}Z`;

export const rrect = (
  x: number,
  y: number,
  w: number,
  h: number,
  c = 3,
): P[] => [
  [x + c, y],
  [x + w - c, y],
  [x + w, y + c],
  [x + w, y + h - c],
  [x + w - c, y + h],
  [x + c, y + h],
  [x, y + h - c],
  [x, y + c],
];

export const shift = (pts: P[], dx: number, dy: number): P[] =>
  pts.map(([x, y]) => [x + dx, y + dy] as P);
