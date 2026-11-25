import type { Feature } from './slides';

export const KIND_COLOR: Record<Feature['kind'], string> = {
  page: 'var(--m-chart-7)',
  event: 'var(--m-chart-1)',
  click: 'var(--m-chart-3)',
};
export const KIND_LABEL: Record<Feature['kind'], string> = {
  page: 'Page',
  event: 'Custom event',
  click: 'Click',
};

const AXIS = { fill: 'var(--m-chart-axis)', fontSize: 11 } as const;

const niceMax = (v: number) => {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
const num1 = (v: number) => String(Math.round(v * 10) / 10);
const ticks = (max: number) => [0, 1, 2, 3, 4].map((k) => (max * k) / 4);

/** A daily line; a day with no sessions (null) breaks it. */
export function Spark({
  values,
  color = 'var(--m-chart-1)',
}: {
  values: Array<number | null>;
  color?: string;
}) {
  const vals = values.filter((v): v is number => v != null);
  if (values.length < 2 || vals.length < 2) return null;
  const w = 300;
  const h = 64;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const X = (i: number) => ((i / (values.length - 1)) * w).toFixed(1);
  const Y = (v: number) =>
    (6 + (1 - (v - lo) / (hi - lo || 1)) * (h - 12)).toFixed(1);
  const runs: number[][] = [];
  let run: number[] = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push(i);
  });
  if (run.length) runs.push(run);
  let last = values.length - 1;
  while (last > 0 && values[last] == null) last -= 1;
  return (
    <svg
      className="spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {runs.map((r) => {
        const d = r
          .map((i, k) => `${k ? 'L' : 'M'}${X(i)} ${Y(values[i]!)}`)
          .join(' ');
        return r.length > 1 ? (
          <g key={r[0]}>
            <path
              d={`${d} L ${X(r[r.length - 1]!)} ${h} L ${X(r[0]!)} ${h} Z`}
              fill={color}
              fillOpacity={0.1}
            />
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </g>
        ) : null;
      })}
      <path
        d={`M${X(last)} ${Y(values[last]!)} l0.01 0`}
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function ScatterChart({ features }: { features: Feature[] }) {
  const W = 620;
  const H = 380;
  const L = 48;
  const B = 34;
  const T = 12;
  const R = 16;
  const xm = Math.min(
    100,
    niceMax(Math.max(...features.map((f) => f.popularity)) * 1.05),
  );
  const ym = niceMax(Math.max(...features.map((f) => f.frequency)) * 1.15);
  const x = (p: number) => L + (p / xm) * (W - L - R);
  const y = (f: number) => H - B - (f / ym) * (H - B - T);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Popularity and frequency of the top features"
    >
      {ticks(xm).map((t) => (
        <g key={`x${t}`}>
          <line
            x1={x(t)}
            x2={x(t)}
            y1={T}
            y2={H - B}
            stroke="var(--m-chart-grid)"
          />
          <text x={x(t)} y={H - B + 20} textAnchor="middle" {...AXIS}>
            {num1(t)}%
          </text>
        </g>
      ))}
      {ticks(ym).map((t) => (
        <g key={`y${t}`}>
          <line
            x1={L}
            x2={W - R}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--m-chart-grid)"
          />
          <text x={L - 10} y={y(t) + 4} textAnchor="end" {...AXIS}>
            {num1(t)}%
          </text>
        </g>
      ))}
      {[...features].reverse().map((f) => (
        <g key={f.n}>
          <title>{`${f.n}. ${f.name}: ${f.popularity}% of people, ${f.frequency}% of interactions`}</title>
          <circle
            cx={x(f.popularity)}
            cy={y(f.frequency)}
            r={13}
            fill={KIND_COLOR[f.kind]}
          />
          <text
            x={x(f.popularity)}
            y={y(f.frequency) + 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="#fff"
          >
            {f.n}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function IntensityChart({ features }: { features: Feature[] }) {
  const W = 620;
  const H = 380;
  const L = 40;
  const B = 34;
  const T = 22;
  const R = 8;
  const max = niceMax(Math.max(...features.map((f) => f.perPerson)));
  const bw = (W - L - R) / features.length;
  const y = (v: number) => H - B - (v / max) * (H - B - T);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Average uses per person of the top features"
    >
      {ticks(max).map((t) => (
        <g key={t}>
          <line
            x1={L}
            x2={W - R}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--m-chart-grid)"
          />
          <text x={L - 10} y={y(t) + 4} textAnchor="end" {...AXIS}>
            {num1(t)}
          </text>
        </g>
      ))}
      {features.map((f, i) => {
        const bx = L + i * bw + bw * 0.18;
        const w = bw * 0.64;
        return (
          <g key={f.n}>
            <rect
              x={bx}
              y={y(f.perPerson)}
              width={w}
              height={Math.max(1, y(0) - y(f.perPerson))}
              rx={3}
              fill={KIND_COLOR[f.kind]}
            />
            <text
              x={bx + w / 2}
              y={y(f.perPerson) - 6}
              textAnchor="middle"
              fontSize={11.5}
              fill="var(--m-content-secondary)"
            >
              {num1(f.perPerson)}
            </text>
            <text x={bx + w / 2} y={H - B + 18} textAnchor="middle" {...AXIS}>
              {f.n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function RetentionChart({
  points,
  unit,
}: {
  points: Array<{ k: number; pct: number }>;
  unit: 'day' | 'week';
}) {
  const K = points.length;
  if (!K) return null;
  const W = 760;
  const H = 360;
  const L = 52;
  const B = 40;
  const T = 24;
  const R = 24;
  const U = unit === 'week' ? 'Week' : 'Day';
  const ym = Math.min(
    100,
    niceMax(Math.max(...points.map((p) => p.pct), 1) * 1.15),
  );
  const x = (i: number) =>
    K === 1 ? (L + W - R) / 2 : L + (i / (K - 1)) * (W - L - R);
  const y = (v: number) => H - B - (v / ym) * (H - B - T);
  const xy = points.map((p, i): [number, number] => [x(i), y(p.pct)]);
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
  const every = Math.max(1, Math.ceil(K / 10));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Share of people back, by ${unit} after their first visit`}
    >
      {ticks(ym).map((t) => (
        <g key={t}>
          <line
            x1={L}
            x2={W - R}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--m-chart-grid)"
          />
          <text x={L - 12} y={y(t) + 4} textAnchor="end" {...AXIS}>
            {num1(t)}%
          </text>
        </g>
      ))}
      {points.map((p, i) =>
        i % every === 0 ? (
          <text key={p.k} x={x(i)} y={H - B + 22} textAnchor="middle" {...AXIS}>
            {U} {p.k}
          </text>
        ) : null,
      )}
      {K > 1 && (
        <path
          d={`${line} L ${xy[K - 1]![0]} ${y(0)} L ${xy[0]![0]} ${y(0)} Z`}
          fill="var(--m-chart-1)"
          fillOpacity={0.1}
        />
      )}
      <path
        d={line}
        fill="none"
        stroke="var(--m-chart-1)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {xy.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="var(--m-chart-1)" />
      ))}
      {K <= 14 &&
        xy.map((p, i) => (
          <text
            key={`l${i}`}
            x={p[0]}
            y={p[1] - 14}
            textAnchor="middle"
            fontSize={12}
            fill="var(--m-content-secondary)"
          >
            {Math.round(points[i]!.pct)}%
          </text>
        ))}
    </svg>
  );
}
