/** A scroll map as the API sends it: how deep each session went on the page. */
export interface ScrollMapData {
  sessions: number;
  /** Percent of the page visible without scrolling (median over sessions). */
  fold: number;
  /** Sessions by the deepest point they saw, in percent of the page (0..100). */
  depths: { depth: number; sessions: number }[];
}

export interface ScrollReach {
  sessions: number;
  fold: number;
  /** reach[d]: percent of sessions that saw depth d (0..100) of the page. */
  reach: number[];
  /** The depth half of the sessions reach. */
  median: number;
  /** Where the share of sessions still reading falls to 75, 50 and 25%. */
  marks: { share: number; depth: number }[];
}

export const REACH_MARKS = [75, 50, 25];

export function isScrollMapData(value: unknown): value is ScrollMapData {
  const v = value as ScrollMapData | null;
  return !!v && typeof v.sessions === 'number' && Array.isArray(v.depths);
}

export function scrollReach(
  data: ScrollMapData | null | undefined,
): ScrollReach | null {
  if (!data) return null;
  const fold = Math.max(0, Math.min(100, data.fold));
  const atDepth = new Array<number>(101).fill(0);
  for (const { depth, sessions } of data.depths) {
    // depths come in 5% steps rounded down, the fold isn't: a session that
    // never scrolled still saw the whole fold
    const d = Math.max(Math.floor(fold), Math.min(100, Math.floor(depth)));
    atDepth[d] += sessions;
  }
  const total = atDepth.reduce((a, n) => a + n, 0);
  if (!total) return null;

  const reach = new Array<number>(101);
  let deeper = 0;
  for (let d = 100; d >= 0; d--) {
    deeper += atDepth[d];
    reach[d] = (deeper / total) * 100;
  }
  const fallsTo = (share: number) => {
    const d = reach.findIndex((r) => r <= share);
    return d < 0 ? null : d;
  };
  const marks = REACH_MARKS.flatMap((share) => {
    const depth = fallsTo(share);
    return depth == null ? [] : [{ share, depth }];
  });
  return {
    sessions: data.sessions || total,
    fold,
    reach,
    median: fallsTo(50) ?? 100,
    marks,
  };
}

// the click layer's ramp, spread so the 75/50/25% lines fall on yellow/lime/cyan
const REACH_RAMP: [number, [number, number, number]][] = [
  [0, [0, 0, 255]],
  [25, [0, 255, 255]],
  [50, [0, 255, 0]],
  [75, [255, 255, 0]],
  [100, [255, 0, 0]],
];

export function reachColor(share: number): string {
  const r = Math.max(0, Math.min(100, share));
  const i = Math.max(
    1,
    REACH_RAMP.findIndex(([at]) => at >= r),
  );
  const [a, ca] = REACH_RAMP[i - 1];
  const [b, cb] = REACH_RAMP[i];
  const k = (r - a) / (b - a);
  const c = ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
  return `rgb(${c.join(' ')})`;
}

/** The page tint: warm where everyone looked, cool where few did. */
export function reachGradient(reach: number[], step = 2): string {
  const stops: string[] = [];
  for (let d = 0; d <= 100; d += step) {
    stops.push(`${reachColor(reach[d])} ${d}%`);
  }
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}
