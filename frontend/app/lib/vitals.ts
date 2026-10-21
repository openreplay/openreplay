export type VitalStatus = 'good' | 'medium' | 'bad';

/** Whole milliseconds, seconds from 1,000, CLS to two places. */
export function formatVital(key: string, value: number) {
  if (!value) return 'N/A';
  if (key === 'cls') return value.toFixed(2);
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${Math.round(value)} ms`;
}

// web.dev's good / poor edges
const EDGES: Record<string, [number, number]> = {
  ttfb: [800, 1800],
  fcp: [1800, 3000],
  lcp: [2500, 4000],
  cls: [0.1, 0.25],
};

export function vitalStatus(key: string, value: number): VitalStatus | null {
  const edge = EDGES[key];
  if (!edge) return null;
  return value <= edge[0] ? 'good' : value <= edge[1] ? 'medium' : 'bad';
}
