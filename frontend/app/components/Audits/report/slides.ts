// The audit report as slides: GET /report (schema version 4) → one 16:9 slide each.
// Mirrors the report job's own deck (ee/melonade/audits/engine/assets/sections.html in the
// saas repo) with the prototype's slide designs. A figure the data doesn't carry is left
// out, never invented.
import type { SubjectKind } from '@/ui/illustrations/subjects';

import { CHAPTERS, type ChapterKey, chapterOfGroup } from '../model';
import type {
  AnalyticsSection,
  Fact as ApiFact,
  Insight as ApiInsight,
  IssuesData,
  Metric,
  Report,
  ReportCompare,
  ReportMeta,
  ReportPeriod,
  SectionKey,
  TopList,
  TopRow,
  UnverifiedNumber,
  VitalMetric,
} from '../types';

export type SlideSection = ChapterKey | 'intro' | 'notes';

export type Tone = 'good' | 'bad' | 'flat';

export interface Delta {
  text: string;
  tone: Tone;
  vs: string;
}

export interface Kpi {
  label: string;
  value: string;
  unit?: string;
  delta?: Delta;
  note?: string;
  spark?: Array<number | null>;
  split?: Array<{ label: string; value: number }>;
}

export type Fact = [value: string, label: string];

export type RowMark =
  | { kind: 'user'; seed: string }
  | { kind: 'flag'; cc: string }
  | { kind: 'browser'; name: string }
  | { kind: 'device'; device: 'monitor' | 'phone' | 'both' };

export type RowLine =
  | { kind: 'bar'; pct: number; value: string; unit?: string; rest?: string }
  | { kind: 'impact'; level: 'High' | 'Medium' | 'Low'; text: string }
  | { kind: 'outcome'; shares: [number, number, number] }
  | { kind: 'pairs'; pairs: Array<[string, string]> };

export interface ReportRow {
  title: string;
  /** an unlabelled control: the title is a placeholder */
  unlabelled?: boolean;
  code?: string;
  mono?: boolean;
  description?: string;
  mark?: RowMark;
  tag?: { text: string; tone: Tone };
  /** 1 small · 2 medium · 3 high */
  effort?: 1 | 2 | 3;
  highlight?: boolean;
  critical?: boolean;
  tags?: string[];
  lines?: RowLine[];
}

export interface VitalCardData {
  key: string;
  name: string;
  limits: string;
  /** null: no page loads with this measure on that device */
  device: {
    avg: string;
    rating: 0 | 1 | 2;
    delta?: Delta;
    p75: string;
    shares: [number, number, number];
    loads: number;
  } | null;
}

export interface MatrixColumn {
  label: string;
  sub?: string;
  few?: boolean;
}

export interface Feature {
  n: number;
  name: string;
  kind: 'page' | 'event' | 'click';
  popularity: number;
  frequency: number;
  perPerson: number;
}

export interface InsightPart {
  text: string;
  em: boolean;
}

interface SlideBase {
  section: SlideSection;
  short: string;
  title: string;
  foot?: string;
  ai?: boolean;
  effortLegend?: boolean;
}

export type Slide =
  | (SlideBase & { kind: 'cover' })
  | (SlideBase & { kind: 'contents' })
  | (SlideBase & { kind: 'insight'; parts: InsightPart[]; art?: SubjectKind })
  | (SlideBase & {
      kind: 'summary';
      points: Array<{
        figure: string;
        tone?: 'good' | 'bad';
        lead: string;
        text: string;
      }>;
      unverified?: string[];
    })
  | (SlideBase & { kind: 'kpis'; kpis: Kpi[] })
  | (SlideBase & {
      kind: 'list';
      facts: Fact[];
      rows: ReportRow[];
      start?: number;
      unverified?: string[];
    })
  | (SlideBase & {
      kind: 'vitals';
      device: 'desktop' | 'mobile';
      vitals: VitalCardData[];
    })
  | (SlideBase & {
      kind: 'matrix';
      lead: string;
      columns: MatrixColumn[];
      rows: Array<{ title: string; note?: string; values: number[] }>;
      threshold: number;
      start?: number;
    })
  | (SlideBase & {
      kind: 'features';
      chart: 'scatter' | 'bars';
      features: Feature[];
    })
  | (SlideBase & {
      kind: 'retention';
      unit: 'day' | 'week';
      points: Array<{ k: number; pct: number; users?: number; of?: number }>;
      facts: Fact[];
    })
  | (SlideBase & { kind: 'notes'; notes: Array<[title: string, text: string]> })
  | (SlideBase & { kind: 'message'; text: string; failed?: boolean });

export interface DeckMeta {
  title: string;
  month: string;
  period: string;
  organization: string;
  project: string;
  generated: string;
  createdBy?: string;
  sessions?: number;
  users?: number;
}

export interface Deck {
  meta: DeckMeta;
  slides: Slide[];
}

// ---- formatting (the report job's) ----

export const fmt = (n?: number | null) =>
  n == null ? '–' : Number(n).toLocaleString('en-US');
export const pad2 = (n: number) => String(n).padStart(2, '0');
const pctT = (v?: number | null) =>
  v == null
    ? '–'
    : `${(Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, '')}%`;
const share = (v?: number | null) =>
  v === 0 ? 'under 1%' : v == null ? '–' : `${v}%`;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const D = (iso: string) => new Date(`${iso}T00:00:00Z`);
const dayM = (iso: string) =>
  `${D(iso).getUTCDate()} ${MONTHS[D(iso).getUTCMonth()]}`;
const dayMY = (iso: string) => `${dayM(iso)} ${D(iso).getUTCFullYear()}`;
export function range(a?: string, b?: string): string {
  if (!a || !b) return '';
  const A = D(a);
  const B = D(b);
  if (a === b) return dayMY(a);
  if (A.getUTCFullYear() !== B.getUTCFullYear())
    return `${dayMY(a)} – ${dayMY(b)}`;
  if (A.getUTCMonth() !== B.getUTCMonth()) return `${dayM(a)} – ${dayMY(b)}`;
  return `${A.getUTCDate()}–${dayMY(b)}`;
}
const monthY = (iso?: string) =>
  !iso
    ? ''
    : new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString(
        'en-GB',
        { month: 'long', year: 'numeric', timeZone: 'UTC' },
      );
function stamp(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${dayMY(d.toISOString().slice(0, 10))}, ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
}
const mmss = (s: number) => {
  const r0 = Math.round(s);
  const h = Math.floor(r0 / 3600);
  const m = Math.floor((r0 % 3600) / 60);
  const r = r0 % 60;
  return h ? `${h}:${pad2(m)}:${pad2(r)}` : `${m}:${pad2(r)}`;
};
const hm = (s: number) => {
  let h = Math.floor(s / 3600);
  let m = Math.round((s % 3600) / 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  return h ? `${h}h ${m}m` : `${m}m`;
};
const msT = (v: number) =>
  v >= 1000
    ? `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)} s`
    : `${Math.round(v)} ms`;
type Unit = Metric['unit'] | 'ms' | 'cls' | 'sec';
function val(v: number | null | undefined, unit: Unit): string {
  if (v == null) return '–';
  switch (unit) {
    case 'count':
      return fmt(Math.round(v));
    case 'ratio':
      return v.toFixed(1);
    case 'duration':
      return mmss(v);
    case 'pct':
      return `${v.toFixed(1)}%`;
    case 'ms':
      return msT(v);
    case 'cls':
      return v.toFixed(2);
    case 'sec':
      return `${v.toFixed(1)} s`;
    default:
      return String(v);
  }
}
const plural = (w: string) =>
  /s$/i.test(w) ? w : /[^aeiou]y$/i.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const per = (n: number | undefined, w: string) =>
  n === 1 ? w.replace(/s$/, '') : w;
const facts = (f?: ApiFact[] | null): Fact[] =>
  (f ?? []).map((x) => [x.value, x.label]);
const chunk = <T>(a: readonly T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
};
const unverifiedOf = (u?: UnverifiedNumber[] | null) =>
  (u ?? []).map((x) => x.number ?? '').filter(Boolean);

function deltaOf(
  value: number | null | undefined,
  prev: number | null | undefined,
  unit: Unit,
  better: 'up' | 'down',
): Omit<Delta, 'vs'> | null {
  if (value == null || prev == null) return null;
  const pts = unit === 'pct';
  if (!pts && !prev) return { text: 'New', tone: 'flat' };
  const diff = pts ? value - prev : ((value - prev) / prev) * 100;
  const flat = Math.abs(diff) < (pts ? 0.1 : 0.5);
  const up = diff > 0;
  return {
    text: flat
      ? 'No change'
      : `${up ? '▲' : '▼'} ${Math.abs(diff).toFixed(1)}${pts ? ' pts' : '%'}`,
    tone: flat ? 'flat' : up === (better === 'up') ? 'good' : 'bad',
  };
}

/** Phrases of an insight drawn in the accent: the writer's, else its first numbers. */
export function emphasise(text: string, em?: string[] | null): InsightPart[] {
  const marks = (
    em && em.length
      ? em
      : (
          text.match(/[−+-]?\d+(?:[.,]\d+)*\s?(?:%|×| s| ms| pts| points)?/g) ??
          []
        ).slice(0, 3)
  )
    .map((m) => m.trim())
    .filter(Boolean);
  const hits: Array<[number, number]> = [];
  for (const m of [...new Set(marks)].sort((a, b) => b.length - a.length)) {
    const at = text.indexOf(m);
    if (at < 0) continue;
    if (hits.some(([s, e]) => at < e && at + m.length > s)) continue;
    hits.push([at, at + m.length]);
  }
  hits.sort((a, b) => a[0] - b[0]);
  const parts: InsightPart[] = [];
  let last = 0;
  for (const [s, e] of hits) {
    if (s > last) parts.push({ text: text.slice(last, s), em: false });
    parts.push({ text: text.slice(s, e), em: true });
    last = e;
  }
  if (last < text.length) parts.push({ text: text.slice(last), em: false });
  return parts;
}

// ---- builder ----

const VISION = 'Melonade’s vision model';

const INSIGHT_ART: Partial<
  Record<SectionKey | 'summary' | 'groups', SubjectKind>
> = {
  summary: 'chart',
  'ux.frustrations': 'sessions',
  'ux.quickwins': 'tests',
  'journeys.overview': 'activity',
  groups: 'segments',
  'journeys.actions': 'events',
  'journeys.issues': 'issues',
};

const TITLES: Record<SectionKey, string> = {
  'web.numbers': 'Traffic and engagement',
  'web.tops': 'Top lists',
  'product.tops': 'Top lists',
  'product.features': 'Feature use',
  'errors.numbers': 'Error rates',
  'errors.tops': 'Errors, requests and pages',
  'errors.vitals': 'Web Vitals',
  'ux.numbers': 'Signs of struggle',
  'ux.frustrations': 'Encountered frustrations',
  'ux.quickwins': 'Quick wins',
  'adoption.features': 'Popularity and frequency',
  'adoption.retention': 'User retention',
  'journeys.overview': 'Journeys',
  'journeys.popular': 'Popular journeys',
  'journeys.actions': 'Common actions',
  'journeys.issues': 'Most impactful issues',
};

interface Ctx {
  S: Slide[];
  M: ReportMeta;
  cmp: ReportCompare;
  per: ReportPeriod;
  sec: ChapterKey;
}

const pageName = (base: string, parts: number, from: number, len: number) =>
  parts < 2
    ? base
    : len === 1
      ? `${base} ${from + 1}`
      : `${base} ${from + 1}–${from + len}`;

function kpiOf(m: Metric, cmp: ReportCompare): Kpi {
  const unit =
    m.unit === 'duration' && m.value != null
      ? m.value >= 3600
        ? 'h'
        : 'min'
      : undefined;
  const d = cmp.available ? deltaOf(m.value, m.prev, m.unit, m.better) : null;
  const note =
    m.sessions != null
      ? `${fmt(m.sessions)} ${per(m.sessions, 'sessions')}`
      : !d && cmp.available && m.value != null
        ? 'No earlier figure'
        : undefined;
  const split =
    m.split && (m.split.desktop || m.split.mobile)
      ? [
          { label: 'Desktop', value: m.split.desktop ?? 0 },
          { label: 'Mobile', value: m.split.mobile ?? 0 },
        ]
      : undefined;
  return {
    label: m.label,
    value: val(m.value, m.unit),
    unit,
    delta: d ? { ...d, vs: val(m.prev, m.unit) } : undefined,
    note,
    spark: split ? undefined : (m.series ?? undefined),
    split,
  };
}

interface TopOpts {
  unit?: string;
  of?: string;
  key?: keyof TopRow;
  mark?: (r: TopRow) => RowMark | undefined;
  code?: (r: TopRow) => string | undefined;
  mono?: boolean;
  value?: (r: TopRow) => string;
  rest?: (r: TopRow) => string | undefined;
  tag?: (r: TopRow) => ReportRow['tag'];
}

function topRows(rows: readonly TopRow[], o: TopOpts = {}): ReportRow[] {
  const key = o.key ?? 'sessions';
  const unit = o.unit ?? 'sessions';
  const of = o.of ?? 'sessions';
  const num = (r: TopRow) => Number(r[key] ?? 0);
  const top = Math.max(1e-9, ...rows.map(num));
  return rows.map((r) => ({
    title: r.label ?? 'Unlabelled element',
    unlabelled: r.label == null,
    mono: o.mono,
    mark: o.mark?.(r),
    code: o.code ? o.code(r) : r.label == null ? r.selector : undefined,
    tag: o.tag?.(r),
    lines: [
      {
        kind: 'bar',
        pct: (100 * num(r)) / top,
        value: o.value ? o.value(r) : fmt(num(r)),
        unit: o.value ? undefined : per(num(r), unit),
        rest: o.rest
          ? o.rest(r)
          : r.share != null && of
            ? `${pctT(r.share)} of ${of}`
            : undefined,
      },
    ],
  }));
}

function pushList(
  X: Ctx,
  short: string,
  title: string,
  f: Fact[],
  rows: ReportRow[],
  foot?: string,
  extra: Partial<SlideBase> & { unverified?: string[]; size?: number } = {},
) {
  const { size = 5, ...rest } = extra;
  const parts = chunk(rows, size);
  parts.forEach((part, k) =>
    X.S.push({
      kind: 'list',
      section: X.sec,
      short: pageName(short, parts.length, k * size, part.length),
      title,
      facts: f,
      rows: part,
      start: k * size,
      foot,
      ...rest,
    }),
  );
}

function pushMessage(
  X: Ctx,
  short: string,
  title: string,
  text: string,
  foot?: string,
  extra: Partial<SlideBase> & { failed?: boolean } = {},
) {
  X.S.push({
    kind: 'message',
    section: X.sec,
    short,
    title,
    text,
    foot,
    ...extra,
  });
}

function pushInsight(
  X: Ctx,
  short: string,
  insight: ApiInsight | null | undefined,
  art: SubjectKind | undefined,
  extra = '',
) {
  if (!insight?.text) return;
  X.S.push({
    kind: 'insight',
    section: X.sec,
    short: `${short}: insight`,
    title: short,
    parts: emphasise(insight.text, insight.em),
    art,
    ai: true,
    foot: [insight.basis, extra].filter(Boolean).join(' '),
  });
}

const sampleNote = (
  d: {
    sample?: { matched?: number; read?: number } | null;
    read?: number;
  } | null,
  M: ReportMeta,
) => {
  const s = d?.sample;
  const matched = s ? s.matched : M.sessions;
  const read = s ? s.read : d?.read;
  return read
    ? `Based on ${fmt(read)} of the ${fmt(matched)} sessions, read by ${VISION}.`
    : `Read by ${VISION}.`;
};

function issueRows(d: IssuesData, tagKey: 'categories' | 'tags'): ReportRow[] {
  const hl = new Set(d.highlight?.rows ?? []);
  return d.rows.map((r, i) => {
    const seen =
      r.share != null
        ? `seen in ${r.share < 1 ? 'under 1%' : pctT(r.share)} of the sessions read`
        : 'seen in the sessions read';
    const words = r[tagKey] ?? [];
    const cats = words.length
      ? ` · ${tagKey === 'categories' ? 'category' : 'tags'} ${words.join(', ')}`
      : '';
    return {
      title: r.name,
      description: r.description,
      highlight: r.hl || hl.has(i + 1),
      critical: r.critical,
      tags: r.journeys?.length ? r.journeys : undefined,
      lines: [{ kind: 'impact', level: r.impact, text: seen + cats }],
    };
  });
}

const browserMark = (r: TopRow): RowMark => ({
  kind: 'browser',
  name: r.label ?? '',
});
const deviceMark = (r: TopRow): RowMark => ({
  kind: 'device',
  device:
    r.kind === 'desktop' ? 'monitor' : r.kind === 'mobile' ? 'phone' : 'both',
});
const userMark = (r: TopRow): RowMark => ({
  kind: 'user',
  seed: r.label ?? '?',
});

const listsOf = (lists: TopList[]) => {
  const L: Partial<Record<TopList['key'], TopList>> = {};
  for (const l of lists) L[l.key] = l;
  return L;
};

type Builder = (X: Ctx, s: AnalyticsSection) => void;

const BUILDERS: Partial<Record<SectionKey, Builder>> = {
  'web.numbers': (X, s) => {
    if (s.block !== 'numbers' || !s.data) return;
    const gaps = (X.cmp.gaps ?? []).map(dayM);
    X.S.push({
      kind: 'kpis',
      section: X.sec,
      short: 'Traffic',
      title: 'Traffic and engagement',
      kpis: s.data.metrics.map((m) => kpiOf(m, X.cmp)),
      foot: `Unique users: distinct user IDs the app set; sessions per user count sessions with a user ID.${X.per.start ? ` Daily lines run ${dayM(X.per.start)} to ${dayM(X.per.end)}.` : ''}${gaps.length ? ` ${gaps.join(', ')} had no sessions in the comparison period, likely a recording gap: totals such as sessions and users read high against it; rates and averages hardly move.` : ''}`,
    });
  },
  'web.tops': (X, s) => {
    if (s.block !== 'tops' || !s.data) return;
    const L = listsOf(s.data.lists);
    const opts: Partial<Record<TopList['key'], TopOpts>> = {
      countries: { mark: (r) => ({ kind: 'flag', cc: r.code ?? '' }) },
      browsers: { mark: browserMark },
      platforms: { mark: deviceMark },
      devices: { mark: deviceMark },
      pages: {
        unit: 'views',
        of: 'views',
        key: 'views',
        code: (r) => r.code || r.sub,
      },
      users: { mark: userMark },
    };
    const order: Array<[TopList['key'], string, string]> = [
      ['referrers', 'Referrers', 'Top referrers'],
      ['countries', 'Countries', 'Top countries'],
      ['browsers', 'Browsers', 'Top browsers'],
      ['platforms', 'Platforms', 'Top platforms'],
      ['devices', 'Devices', 'Top devices'],
      ['pages', 'Pages', 'Top pages'],
      ['users', 'Users', 'Top users'],
    ];
    for (const [k, short, title] of order) {
      const l = L[k];
      if (!l) continue;
      if (!l.rows.length)
        pushMessage(X, short, title, 'Nothing in this period.', l.note);
      else
        pushList(
          X,
          short,
          title,
          facts(l.facts),
          topRows(l.rows, opts[k]),
          l.note,
        );
    }
  },
  'product.tops': (X, s) => {
    if (s.block !== 'tops' || !s.data) return;
    const L = listsOf(s.data.lists);
    const order: Array<[TopList['key'], string, string, TopOpts]> = [
      [
        'clicks',
        'Clicks',
        'Top clicks',
        {
          unit: 'clicks',
          of: '',
          key: 'events',
          code: (r) => (r.label == null ? r.selector : r.code || r.page),
        },
      ],
      [
        'events',
        'Events',
        'Top events',
        { unit: 'times', of: '', key: 'count' },
      ],
      [
        'usersByTime',
        'Time spent',
        'Top users by time spent',
        {
          key: 'time',
          mark: userMark,
          value: (r) => hm(r.time ?? 0),
          rest: () => undefined,
        },
      ],
    ];
    for (const [k, short, title, o] of order) {
      const l = L[k];
      if (!l) continue;
      if (!l.rows.length)
        pushMessage(X, short, title, 'Nothing in this period.', l.note);
      else
        pushList(X, short, title, facts(l.facts), topRows(l.rows, o), l.note);
    }
    for (const f of s.data.metadata?.fields ?? []) {
      const name = f.name || f.key || 'value';
      const rows: TopRow[] = (f.rows ?? []).map((r) => ({
        label: r.label ?? null,
        sessions: r.sessions,
        share: r.share,
        unset: r.unset,
      }));
      pushList(
        X,
        cap(plural(name)),
        `Top ${plural(name)}`,
        facts(f.facts),
        topRows(rows),
        f.note,
      );
    }
  },
  'product.features': (X, s) => {
    if (s.block !== 'features' || !s.data) return;
    const d = s.data;
    if (!d.rows.length) {
      pushMessage(
        X,
        'Features',
        'Feature use',
        'No feature was used in this period.',
      );
      return;
    }
    const cols = d.columns ?? [];
    const foot =
      (d.source === 'feature map'
        ? 'A session uses a feature when it opens one of its pages, sends its event or clicks its control.'
        : 'No feature map for this project, so features are the main page areas and custom events.') +
      (cols.length
        ? ' Each cell: the share of that column’s sessions that use the feature; read across a row to compare. Teal: the group uses it more than the first column; orange: less.'
        : '') +
      (d.skipped ? ` Left out (filters not supported yet): ${d.skipped}.` : '');
    if (!cols.length) {
      pushList(
        X,
        'Features',
        'Feature use',
        facts(d.facts),
        d.rows.map((r) => ({
          title: r.name ?? '',
          lines: [
            {
              kind: 'bar',
              pct: r.pct ?? 0,
              value: pctT(r.pct),
              unit: 'of sessions',
              rest: `${fmt(r.sessions)} sessions`,
            },
          ],
        })),
        foot,
      );
      return;
    }
    const columns: MatrixColumn[] = [
      {
        label:
          d.mode === 'segment'
            ? X.M.scope?.name || 'This segment'
            : 'All traffic',
        sub: `${fmt(X.M.sessions)} sessions`,
      },
      ...cols.map((c) => ({
        label: c.label ?? '',
        sub: `${fmt(c.sessions)} sessions`,
      })),
    ];
    const parts = chunk(d.rows, 5);
    parts.forEach((part, k) =>
      X.S.push({
        kind: 'matrix',
        section: X.sec,
        short: pageName('Features', parts.length, k * 5, part.length),
        title: 'Feature use',
        lead: 'Feature',
        threshold: 3,
        start: k * 5,
        columns,
        rows: part.map((r) => ({
          title: r.name ?? '',
          note: `${fmt(r.sessions)} sessions`,
          values: [
            Math.round((r.pct ?? 0) * 10) / 10,
            ...cols.map(
              (c) => Math.round((r.cells?.[c.key ?? ''] ?? 0) * 10) / 10,
            ),
          ],
        })),
        foot,
      }),
    );
  },
  'errors.numbers': (X, s) => {
    if (s.block !== 'numbers' || !s.data) return;
    X.S.push({
      kind: 'kpis',
      section: X.sec,
      short: 'Error rates',
      title: 'Error rates',
      kpis: s.data.metrics.map((m) => kpiOf(m, X.cmp)),
      foot: `Rates are shares of all sessions in scope${X.cmp.available ? `, against ${range(X.cmp.start, X.cmp.end)}` : ''}.${X.per.start ? ` Daily lines run ${dayM(X.per.start)} to ${dayM(X.per.end)}.` : ''}`,
    });
  },
  'errors.tops': (X, s) => {
    if (s.block !== 'tops' || !s.data) return;
    for (const f of s.data.metadata?.fields ?? []) {
      const rows = f.rows ?? [];
      const top = Math.max(1e-9, ...rows.map((r) => r.rate ?? 0));
      const name = f.name || f.key || 'value';
      pushList(
        X,
        `Errors by ${name}`,
        `Errors by ${name}`,
        facts(f.facts),
        rows.map((r) => ({
          title: r.label ?? '',
          lines: [
            {
              kind: 'bar',
              pct: (100 * (r.rate ?? 0)) / top,
              value: pctT(r.rate),
              unit: 'of its sessions',
              rest: `${fmt(r.sessions)} sessions with an error`,
            },
          ],
        })),
        f.note,
      );
    }
    const L = listsOf(s.data.lists);
    const users = (r: TopRow) => `${fmt(r.users)} ${per(r.users, 'users')}`;
    const order: Array<[TopList['key'], string, string, TopOpts]> = [
      [
        'jsErrors',
        'JS errors',
        'Top JS errors',
        { code: (r) => r.code, rest: users },
      ],
      [
        'failedRequests',
        'Failed requests',
        'Top failed requests',
        {
          mono: true,
          rest: users,
          tag: (r) =>
            r.status != null
              ? { text: String(r.status), tone: 'bad' }
              : undefined,
        },
      ],
      [
        'slowRequests',
        'Slowest requests',
        'Slowest requests',
        {
          key: 'avg',
          mono: true,
          value: (r) => `${val(r.avg, 'sec')} average`,
          rest: (r) => `${val(r.p75, 'sec')} p75`,
        },
      ],
      [
        'slowPages',
        'Slowest pages',
        'Slowest pages',
        {
          key: 'avg',
          code: (r) => r.code || r.sub,
          value: (r) => `${val(r.avg, 'sec')} average load`,
          rest: (r) => `${val(r.p75, 'sec')} p75`,
        },
      ],
    ];
    for (const [k, short, title, o] of order) {
      const l = L[k];
      if (!l) continue;
      if (!l.rows.length)
        pushMessage(
          X,
          short,
          title,
          k === 'slowRequests' || k === 'slowPages'
            ? 'Nothing had enough calls or loads in this period to rank.'
            : 'None in this period.',
          l.note,
        );
      else
        pushList(X, short, title, facts(l.facts), topRows(l.rows, o), l.note);
    }
  },
  'errors.vitals': (X, s) => {
    if (s.block !== 'vitals' || !s.data) return;
    const d = s.data;
    const ORDER = ['ttfb', 'dom', 'lcp', 'fcp', 'si', 'cls'];
    const ms = [...d.metrics].sort(
      (a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key),
    );
    const unitOf = (m: VitalMetric): Unit => (m.unit === 'cls' ? 'cls' : 'ms');
    const lim = (m: VitalMetric) => {
      const [g, p] = m.thresholds ?? [0, 0];
      return m.unit === 'cls'
        ? `≤ ${g} good · > ${p} poor`
        : `≤ ${msT(g)} good · > ${msT(p)} poor`;
    };
    const card = (m: VitalMetric, dev: 'desktop' | 'mobile'): VitalCardData => {
      const x = m[dev];
      const [g, p] = m.thresholds ?? [Infinity, Infinity];
      const delta =
        x && X.cmp.available ? deltaOf(x.avg, x.prev, unitOf(m), 'down') : null;
      return {
        key: m.abbr || m.key.toUpperCase(),
        name: m.name ?? '',
        limits: lim(m),
        device: x
          ? {
              avg: val(x.avg, unitOf(m)),
              rating: (x.avg ?? 0) <= g ? 0 : (x.avg ?? 0) <= p ? 1 : 2,
              delta: delta
                ? { ...delta, vs: val(x.prev, unitOf(m)) }
                : undefined,
              p75: val(x.p75, unitOf(m)),
              shares: (x.dist ?? [0, 0, 0]) as [number, number, number],
              loads: x.n ?? 0,
            }
          : null,
      };
    };
    const vs = X.cmp.available
      ? ` Average and change against ${range(X.cmp.start, X.cmp.end)};`
      : ' Average;';
    (['desktop', 'mobile'] as const).forEach((dev) => {
      const loads = d.loads?.[dev] ?? 0;
      X.S.push({
        kind: 'vitals',
        section: X.sec,
        device: dev,
        short: `Web Vitals: ${dev}`,
        title: `Web Vitals on ${dev}`,
        vitals: ms.map((m) => card(m, dev)),
        foot: `First page load of each ${dev} session: ${fmt(loads)} page views${dev === 'mobile' && loads < 30 ? ', too few to rely on; read the direction, not the figure' : ''}.${vs} P75 is the 75th percentile. Thresholds match ${d.thresholdsFrom || 'the dashboard Web Vitals widget'}. Bars: share of loads in each rating.`,
      });
    });
  },
  'ux.numbers': (X, s) => {
    if (s.block !== 'numbers' || !s.data) return;
    X.S.push({
      kind: 'kpis',
      section: X.sec,
      short: 'Signs of struggle',
      title: 'Signs of struggle',
      kpis: s.data.metrics.map((m) => kpiOf(m, X.cmp)),
      foot: `Shares of all ${fmt(X.M.sessions)} sessions in scope.`,
    });
  },
  'ux.frustrations': (X, s) => {
    if ((s.block !== 'frictions' && s.block !== 'impactfulIssues') || !s.data)
      return;
    const d = s.data;
    pushInsight(
      X,
      'Frustrations',
      s.insight,
      INSIGHT_ART['ux.frustrations'],
      sampleNote(null, X.M),
    );
    if (!d.rows.length) {
      pushMessage(
        X,
        'Frustrations',
        'Encountered frustrations',
        d.empty || 'No frustration stood out.',
        '',
        { ai: true },
      );
      return;
    }
    pushList(
      X,
      'Frustrations',
      'Encountered frustrations',
      facts(d.facts),
      issueRows(d, 'categories'),
      `Found by ${VISION} in ${fmt(d.analysed)} sessions of this period, highest impact first. Impact: share of analysed sessions where the issue was seen; High from 45%, Medium from 25%, Low below.${d.highlight?.says ? ` Marked rows ${d.highlight.says}.` : ''}`,
      { ai: true },
    );
  },
  'ux.quickwins': (X, s) => {
    if (s.block !== 'quickwins' || !s.data) return;
    const d = s.data;
    pushInsight(X, 'Quick wins', s.insight, INSIGHT_ART['ux.quickwins']);
    if (!d.items.length) {
      pushMessage(
        X,
        'Quick wins',
        'Quick wins',
        'No quick win stands out in this period.',
        '',
        { ai: true },
      );
      return;
    }
    const EFFORT = { S: 1, M: 2, L: 3 } as const;
    pushList(
      X,
      'Quick wins',
      'Quick wins',
      [],
      d.items.map((w) => ({
        title: w.title ?? '',
        description: w.do,
        effort: w.effort ? EFFORT[w.effort] : undefined,
      })),
      `Suggested by a model from this report’s numbers and ${VISION}’s frictions, smallest effort first. Effort is a rough guess from the outside: small is a copy or config change, medium one feature area, high cross-team work.`,
      { ai: true, effortLegend: true, unverified: unverifiedOf(d.unverified) },
    );
  },
  'adoption.features': (X, s) => {
    if (s.block !== 'featureAudit' || !s.data) return;
    const d = s.data;
    if (!d.items.length) {
      pushMessage(
        X,
        'Popularity and frequency',
        'Popularity and frequency',
        'No page views, clicks or custom events in this period.',
      );
      return;
    }
    const features: Feature[] = d.items.map((f, i) => ({
      n: f.n ?? i + 1,
      name: f.label ?? '',
      kind: f.kind ?? 'page',
      popularity: f.popularity ?? 0,
      frequency: f.frequency ?? 0,
      perPerson: f.perUser ?? 0,
    }));
    const who =
      (d.identified ?? 0) >= (d.users ?? 0)
        ? 'by user ID'
        : 'by user ID, or by browser when the app sets none';
    X.S.push({
      kind: 'features',
      section: X.sec,
      short: 'Popularity and frequency',
      title: 'Popularity and frequency',
      chart: 'scatter',
      features,
      foot: `Each bubble is one of the top ${features.length} features. Popularity (across): share of the ${fmt(d.users)} people in scope who used it; the key lists it. Frequency (up): its share of all ${fmt(d.uses)} page views, clicks and custom events. People are counted ${who}.`,
    });
    X.S.push({
      kind: 'features',
      section: X.sec,
      short: 'Intensity of usage',
      title: 'Intensity of usage',
      chart: 'bars',
      features,
      foot: `Average number of times each of the top ${features.length} features was used per person, among the people who used it. People are counted ${who}.`,
    });
  },
  'adoption.retention': (X, s) => {
    if (s.block !== 'retention' || !s.data) return;
    const d = s.data;
    const U = d.unit === 'week' ? 'week' : 'day';
    const f = d.first ?? {};
    const devs = (['desktop', 'mobile'] as const)
      .filter((k) => f[k]?.users)
      .map((k) => {
        const x = f[k]!;
        return `${k} ${pctT(x.rate)} (${fmt(x.returned)} of ${fmt(x.users)})${(x.users ?? 0) < (d.few ?? 0) ? ', few people' : ''}`;
      });
    X.S.push({
      kind: 'retention',
      section: X.sec,
      short: 'Retention',
      title: 'User retention',
      unit: d.unit,
      points: d.points
        .filter((p) => (p.k ?? 0) >= 1)
        .map((p) => ({
          k: p.k ?? 0,
          pct: p.pct ?? 0,
          users: p.users,
          of: p.of,
        })),
      facts: facts(d.facts),
      foot: `Line: share of people with a session ${U} N after their first visit in the period, among those whose first visit left that whole ${U} inside it.${devs.length ? ` ${d.days}-day retention by device: ${devs.join('; ')}.` : ''} Device is that of the first session. A person is a user ID, or the browser when the app sets none.`,
    });
  },
  'journeys.overview': (X, s) => {
    if (s.block !== 'journeyOverview' || !s.data?.text) return;
    const d = s.data;
    const unv = unverifiedOf(d.unverified);
    pushInsight(
      X,
      'Journeys',
      { text: d.text!, em: [], basis: '' },
      INSIGHT_ART['journeys.overview'],
      `${sampleNote(d, X.M)} Weighted to all sessions in scope.${unv.length ? ` Check: ${unv.join(', ')} could not be matched to the counted shares.` : ''}`,
    );
  },
  'journeys.popular': (X, s) => {
    if (s.block !== 'popularJourneys' || !s.data) return;
    const d = s.data;
    if (!d.journeys.length) {
      pushMessage(
        X,
        'Popular journeys',
        'Popular journeys',
        d.note || 'No journey could be named from the sessions read.',
        '',
        { ai: true },
      );
      return;
    }
    const top = Math.max(1, ...d.journeys.map((j) => j.visitsPct ?? 0));
    const foot = `${sampleNote(d, X.M)} Journeys named by a model from the sessions’ one-line descriptions. Shares of visits are weighted to all sessions in scope (± is the 95% margin). How each ended is per person, by their best session.${d.restPct ? ` ${d.more ? `${d.more} smaller journey${d.more === 1 ? '' : 's'} and sessions` : 'Sessions'} that matched none: ${share(d.restPct)} of visits.` : ''}`;
    const rows: ReportRow[] = d.journeys.map((j) => ({
      title: j.name ?? '',
      description: j.means || j.text,
      lines: [
        {
          kind: 'bar',
          pct: (100 * (j.visitsPct ?? 0)) / top,
          value: share(j.visitsPct),
          unit: 'of visits',
          rest: `±${j.margin ?? '–'}${j.usersPct != null ? ` · ${share(j.usersPct)} of users` : ''} · ≈ ${fmt(j.estSessions)} sessions`,
        },
        ...(j.outcomes
          ? [
              {
                kind: 'outcome' as const,
                shares: [
                  j.outcomes.completed ?? 0,
                  j.outcomes.partly ?? 0,
                  j.outcomes.dropped ?? 0,
                ] as [number, number, number],
              },
            ]
          : []),
      ],
    }));
    pushList(
      X,
      'Popular journeys',
      'Popular journeys',
      facts(d.facts),
      rows,
      foot,
      {
        ai: true,
        size: 3,
        unverified: unverifiedOf(d.unverified),
      },
    );

    const cols = d.columns ?? [];
    if (cols.length < 2) return;
    const allAt = Math.max(
      0,
      cols.findIndex((c) => c.kind === 'all'),
    );
    const groups = new Map<string, number[]>();
    cols.forEach((c, i) => {
      if (i === allAt) return;
      const key = c.kind === 'meta' ? `meta:${c.metaKey ?? ''}` : 'segment';
      groups.set(key, [...(groups.get(key) ?? []), i]);
    });
    pushInsight(X, 'Journeys by group', s.groupsInsight, INSIGHT_ART.groups);
    const colOf = (i: number): MatrixColumn => {
      const c = cols[i]!;
      return {
        label: c.kind === 'all' ? 'All sessions' : (c.name ?? ''),
        sub: `${fmt(c.sessions)} read${c.few ? ' · few' : ''}`,
        few: c.few,
      };
    };
    groups.forEach((idx, key) => {
      const by = key === 'segment' ? 'segment' : key.slice(5) || 'group';
      X.S.push({
        kind: 'matrix',
        section: X.sec,
        short: `Journeys by ${by}`,
        title: `Journeys by ${by}`,
        lead: 'Journey',
        threshold: 5,
        ai: true,
        columns: [colOf(allAt), ...idx.map(colOf)],
        rows: d.journeys.map((j) => ({
          title: j.name ?? '',
          values: [j.cells?.[allAt] ?? 0, ...idx.map((i) => j.cells?.[i] ?? 0)],
        })),
        foot: 'Each cell: the share of that column’s visits spent on the journey; read across a row to compare. Teal: the group does it more than all sessions read; orange: less. The deeper the shade, the bigger the gap, full from 10 points; under 2 points a cell stays plain. Under 50 sessions read is few, read with care.',
      });
    });
  },
  'journeys.actions': (X, s) => {
    if (s.block !== 'commonActions' || !s.data) return;
    const d = s.data;
    pushInsight(
      X,
      'Common actions',
      s.insight,
      INSIGHT_ART['journeys.actions'],
      sampleNote(d, X.M),
    );
    if (!d.actions.length) {
      pushMessage(
        X,
        'Common actions',
        'Common actions',
        d.note || 'Too few steps to name the common actions.',
        '',
        { ai: true },
      );
      return;
    }
    pushList(
      X,
      'Common actions',
      'Common actions',
      facts(d.facts),
      d.actions.map((a) => ({
        title: a.label ?? '',
        description: a.means,
        lines: [
          {
            kind: 'bar',
            pct: a.pct ?? 0,
            value: share(a.pct),
            unit: 'of sessions',
            rest: `±${a.margin ?? '–'} · ≈ ${fmt(a.estSessions)} sessions`,
          },
        ],
      })),
      `Steps ${VISION} noted in ${fmt(d.read)} sessions read, merged into named actions by a model and weighted to all ${fmt(d.matched)} sessions in scope; ± is the 95% margin.`,
      { ai: true },
    );
  },
  'journeys.issues': (X, s) => {
    if ((s.block !== 'impactfulIssues' && s.block !== 'frictions') || !s.data)
      return;
    const d = s.data;
    pushInsight(
      X,
      'Impactful issues',
      s.insight,
      INSIGHT_ART['journeys.issues'],
      sampleNote(null, X.M),
    );
    if (!d.rows.length) {
      pushMessage(
        X,
        'Impactful issues',
        'Most impactful issues',
        d.empty || 'No issue stood out.',
        '',
        { ai: true },
      );
      return;
    }
    pushList(
      X,
      'Impactful issues',
      'Most impactful issues',
      facts(d.facts),
      issueRows(d, 'tags'),
      `Found by ${VISION} in the ${fmt(d.analysed)} sessions it analysed (${fmt(d.seen)} distinct), sorted by impact: share of analysed sessions where the issue was seen; High from 45%, Medium from 25%, Low below.${d.highlight?.says ? ` Marked rows ${d.highlight.says}.` : ''}`,
      { ai: true },
    );
  },
};

function deckMeta(R: Report, fallbackTitle: string): DeckMeta {
  const M = R.meta ?? ({} as ReportMeta);
  const per = M.period;
  return {
    title: M.title || M.auditName || fallbackTitle,
    month: monthY(per?.end ?? M.generatedAt),
    period: per ? range(per.start, per.end) : M.periodLabel || '',
    organization: M.orgName || M.projectName || '',
    project: M.projectName || '',
    generated: stamp(M.generatedAt),
    createdBy: M.createdBy,
    sessions: M.sessions ?? M.matchedSessions ?? undefined,
    users: M.users,
  };
}

/** Reports before version 4 (the stub's SampleReport, the AI report types): the summary only. */
function legacySlides(R: Report): Slide[] {
  const S: Slide[] = [
    { kind: 'cover', section: 'intro', short: 'Cover', title: 'Cover' },
  ];
  const sum = R.summary;
  if (sum?.headline || sum?.body)
    S.push({
      kind: 'message',
      section: 'intro',
      short: 'Summary',
      title: sum.headline || 'Summary',
      text: sum.body || '',
    });
  if (sum?.findings?.length)
    S.push({
      kind: 'list',
      section: 'intro',
      short: 'Findings',
      title: 'Findings',
      facts: [],
      rows: sum.findings.map((f) => ({
        title: f.title,
        description: f.detail,
        tag: {
          text: f.severity,
          tone: f.severity === 'minor' ? 'flat' : 'bad',
        },
      })),
    });
  return S;
}

export function buildDeck(R: Report, fallbackTitle = 'Audit'): Deck {
  const meta = deckMeta(R, fallbackTitle);
  if (R.schemaVersion !== 4 || !R.sections)
    return { meta, slides: legacySlides(R) };

  const M = R.meta;
  const cmp: ReportCompare = M.compare ?? { available: false, gaps: [] };
  const per: ReportPeriod = M.period ?? { start: '', end: '', days: 0 };
  const S: Slide[] = [
    { kind: 'cover', section: 'intro', short: 'Cover', title: 'Cover' },
    {
      kind: 'contents',
      section: 'intro',
      short: 'Contents',
      title: 'Contents',
    },
  ];

  const sum = R.summary;
  if (sum?.points?.length) {
    if (sum.insight?.text)
      S.push({
        kind: 'insight',
        section: 'intro',
        short: 'Executive summary: insight',
        title: 'Executive summary',
        parts: emphasise(sum.insight.text, sum.insight.em),
        art: INSIGHT_ART.summary,
        ai: true,
        foot: [sum.insight.basis, 'A summary of this report’s figures.']
          .filter(Boolean)
          .join(' '),
      });
    S.push({
      kind: 'summary',
      section: 'intro',
      short: 'Executive summary',
      title: 'Executive summary',
      ai: true,
      points: sum.points.map((p) => ({
        figure: p.figure,
        tone: p.tone === 'neutral' ? undefined : p.tone,
        lead: p.lead,
        text: p.text,
      })),
      unverified: unverifiedOf(sum.unverified),
      foot: `A summary of this report’s figures${per.start ? `, ${range(per.start, per.end)}` : ''}${cmp.available ? ` against ${range(cmp.start, cmp.end)}` : ''}.`,
    });
  }

  for (const chapter of CHAPTERS) {
    const sections = R.sections.filter(
      (s) => chapterOfGroup(s.group)?.key === chapter.key,
    );
    for (const s of sections) {
      const X: Ctx = { S, M, cmp, per, sec: chapter.key };
      if (s.error || !s.data) {
        pushMessage(
          X,
          TITLES[s.key] ?? s.title,
          TITLES[s.key] ?? s.title,
          s.error || 'This part could not be built.',
          '',
          {
            failed: true,
            ai: s.kind === 'ai',
          },
        );
        continue;
      }
      BUILDERS[s.key]?.(X, s);
    }
  }

  const notes: Array<[string, string]> = [];
  const scope =
    M.scope?.kind === 'segment'
      ? `the segment **${M.scope.name}**${M.scope.filter ? ` (${M.scope.filter})` : ''}`
      : M.scope?.kind === 'segments' && M.segmentName
        ? `every session, with **${M.segmentName}** read beside it`
        : 'every session';
  notes.push([
    'Scope',
    `${M.title}: ${scope} in the project **${M.projectName ?? ''}**${per.start ? `, ${range(per.start, per.end)}` : ''}${cmp.available ? `, against ${range(cmp.start, cmp.end)}` : ''}.${M.createdBy ? ` Created by ${M.createdBy};` : ''} generated ${stamp(M.generatedAt)}.`,
  ]);
  if (per.note) notes.push(['A shorter period', per.note]);
  if (!cmp.available)
    notes.push([
      'No comparison',
      `Sessions before ${cmp.missingBefore ? dayMY(cmp.missingBefore) : 'this period'} are no longer stored, so nothing is compared with an earlier period.`,
    ]);
  const gaps = (cmp.gaps ?? []).map(dayM);
  const pg = (per.gaps ?? []).map(dayM);
  if (gaps.length || pg.length)
    notes.push([
      'Days with no sessions',
      `${[pg.length ? `${pg.join(', ')} in this period` : '', gaps.length ? `${gaps.join(', ')} in the comparison period` : ''].filter(Boolean).join(' and ')} had no sessions, likely a recording gap. Totals such as sessions and users read ${gaps.length && !pg.length ? 'high' : 'low'} against it; rates and averages hardly move. Daily lines leave the day out.`,
    ]);
  const aiParts = R.sections
    .filter(
      (s) =>
        s.kind === 'ai' ||
        s.key === 'ux.frustrations' ||
        s.key === 'journeys.issues',
    )
    .map((s) => TITLES[s.key]);
  if (aiParts.length)
    notes.push([
      'AI-assisted sections',
      `${aiParts.join(', ')}. They come from ${VISION} reading ${M.sample ? `${fmt(M.sample.read)} of the ${fmt(M.sample.matched)}` : 'a share of the'} sessions; journeys and actions are named by a model, and their shares are weighted to all sessions in scope (± is the 95% margin). Quick wins and insights are a model’s suggestions; every number in them is checked against the report’s figures.`,
    ]);
  notes.push([
    'Derived figures',
    'Every figure is counted over the sessions in scope. Figures beside a list that are sums or ratios of its numbers say how they were made in the slide’s note.',
  ]);
  S.push({
    kind: 'notes',
    section: 'notes',
    short: 'Notes',
    title: 'Notes and definitions',
    notes,
  });
  return { meta, slides: S };
}

/** The chapters a deck has, numbered from 01 in this report. */
export function chapterName(
  key: SlideSection,
  slides: readonly Slide[],
): { n?: string; name: string } {
  if (key === 'intro') return { name: 'Overview' };
  if (key === 'notes') return { name: 'Notes' };
  const present = CHAPTERS.filter((c) =>
    slides.some((s) => s.section === c.key),
  );
  const at = present.findIndex((c) => c.key === key);
  const chapter = CHAPTERS.find((c) => c.key === key);
  return { n: at >= 0 ? pad2(at + 1) : undefined, name: chapter?.name ?? key };
}
