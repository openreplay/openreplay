import {
  ArtifactKind,
  Audit,
  AuditFilter,
  AuditSortField,
  AuditStatus,
  ChapterKey,
  CountsParams,
  CreateAuditRequest,
  ListAuditsParams,
  PeriodDays,
  SectionGroup,
  SectionKey,
} from './types';

export type { ChapterKey } from './types';

// ---- Chapters ----
// The six report chapters (New audit's Sections, the report's contents). The API takes
// chapter keys and expands them into its sections.

export interface Chapter {
  key: ChapterKey;
  /** the sections' group in reports made before groups took the chapter keys */
  legacyGroup: SectionGroup;
  name: string;
  /** A few words for a one-line row. */
  brief: string;
  hint: string;
  /** `whole`: needs AI access to be picked; `part`: without it, the API leaves its AI parts out. */
  ai?: 'whole' | 'part';
  sections: readonly SectionKey[];
}

export const CHAPTERS: readonly Chapter[] = [
  {
    key: 'web',
    legacyGroup: 'web',
    name: 'Web analytics',
    brief: 'Traffic, pages, referrers, devices',
    hint: 'Sessions, users, top pages, referrers, countries, browsers and devices',
    sections: ['web.numbers', 'web.tops'],
  },
  {
    key: 'usage',
    legacyGroup: 'product',
    name: 'Product usage',
    brief: 'Clicks, events, time spent, plans',
    hint: 'Top clicks, events, time spent, plans and which features each group uses',
    sections: ['product.tops', 'product.features'],
  },
  {
    key: 'errors',
    legacyGroup: 'errors',
    name: 'Errors and performance',
    brief: 'Errors, failed requests, Web Vitals',
    hint: 'Error rates, top errors and failed requests, slowest requests and pages, Web Vitals',
    sections: ['errors.numbers', 'errors.tops', 'errors.vitals'],
  },
  {
    key: 'retention',
    legacyGroup: 'adoption',
    name: 'Features and retention',
    brief: 'Feature use and who comes back',
    hint: 'Popularity, frequency and intensity of the top features, and who comes back',
    sections: ['adoption.features', 'adoption.retention'],
  },
  {
    key: 'ux',
    legacyGroup: 'ux',
    name: 'UX and frustrations',
    brief: 'Rage clicks, crashes, quick wins',
    hint: 'Dead and rage clicks, crashes, plus the frustrations found and quick wins',
    ai: 'part',
    sections: ['ux.numbers', 'ux.frustrations', 'ux.quickwins'],
  },
  {
    key: 'journeys',
    legacyGroup: 'journeys',
    name: 'Issues and journeys',
    brief: 'Journeys and the issues in them',
    hint: 'Why people come, the steps they take and the issues that hit them most',
    ai: 'whole',
    sections: [
      'journeys.overview',
      'journeys.popular',
      'journeys.actions',
      'journeys.issues',
    ],
  },
];

export const ALL_CHAPTERS: readonly ChapterKey[] = CHAPTERS.map((c) => c.key);

const chapterByGroup = new Map<string, Chapter>([
  ...CHAPTERS.map((c) => [c.legacyGroup, c] as const),
  ...CHAPTERS.map((c) => [c.key, c] as const),
]);

export const chapterOfGroup = (group: SectionGroup): Chapter | undefined =>
  chapterByGroup.get(group);

export const sectionGroup = (key: SectionKey): SectionGroup =>
  key.slice(0, key.indexOf('.')) as SectionGroup;

/** The chapters a project may pick: without AI access (`aiAvailable`), all but `journeys`. */
export const usableChapters = (hasAi: boolean): ChapterKey[] =>
  CHAPTERS.filter((c) => hasAi || c.ai !== 'whole').map((c) => c.key);

/** In report order, whatever order they were picked in; chapters needing AI dropped without it. */
export const orderChapters = (
  picked: readonly ChapterKey[],
  hasAi: boolean,
): ChapterKey[] => usableChapters(hasAi).filter((k) => picked.includes(k));

/** Audits made before chapters were stored: read back from their sections; empty = all. */
export const chaptersOfSections = (
  sections?: readonly SectionKey[] | null,
): ChapterKey[] => {
  if (!sections?.length) return [...ALL_CHAPTERS];
  const groups = new Set(sections.map(sectionGroup));
  return CHAPTERS.filter((c) => groups.has(c.legacyGroup)).map((c) => c.key);
};

// Written by a model (kind `ai` in the API's section registry).
const AI_SECTIONS = new Set<SectionKey>([
  'ux.quickwins',
  'journeys.overview',
  'journeys.popular',
  'journeys.actions',
]);

export const usesAiSections = (
  sections?: readonly SectionKey[] | null,
): boolean => (sections ?? []).some((s) => AI_SECTIONS.has(s));

// ---- Period ----

// Never more than 30 days (most projects keep 30 days of data).
export const AUDIT_PERIODS: readonly PeriodDays[] = [1, 7, 30];
export const DEFAULT_PERIOD: PeriodDays = 7;
export const MAX_CUSTOM_DAYS = 30;

/** Inclusive days, YYYY-MM-DD. */
export interface CustomRange {
  from: string;
  to: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** What the API accepts: ends no later than today (UTC), at most 30 days (the last 30 are kept). */
export function clampCustomRange(
  range: CustomRange,
  today: string,
): CustomRange & { days: number; clamped: boolean } {
  const to = range.to > today ? today : range.to;
  let from = range.from > to ? to : range.from;
  let clamped = to !== range.to || from !== range.from;
  if ((Date.parse(to) - Date.parse(from)) / DAY_MS + 1 > MAX_CUSTOM_DAYS) {
    from = isoDay(Date.parse(to) - (MAX_CUSTOM_DAYS - 1) * DAY_MS);
    clamped = true;
  }
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
  return { from, to, days, clamped };
}

export const periodName = (days: number): string =>
  days === 1 ? 'Last 24 hours' : `Last ${days} days`;

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

/** "13–19 Nov 2026", "28 Oct – 3 Nov 2026", "30 Dec 2025 – 5 Jan 2026" (UTC days). */
export function rangeLabel(from: number, to: number): string {
  const f = new Date(from);
  const t = new Date(to);
  const [fd, fm, fy] = [f.getUTCDate(), f.getUTCMonth(), f.getUTCFullYear()];
  const [td, tm, ty] = [t.getUTCDate(), t.getUTCMonth(), t.getUTCFullYear()];
  if (fd === td && fm === tm && fy === ty) return `${td} ${MONTHS[tm]} ${ty}`;
  if (fy !== ty) return `${fd} ${MONTHS[fm]} ${fy} – ${td} ${MONTHS[tm]} ${ty}`;
  if (fm !== tm) return `${fd} ${MONTHS[fm]} – ${td} ${MONTHS[tm]} ${ty}`;
  return `${fd}–${td} ${MONTHS[tm]} ${ty}`;
}

// ---- Status, tabs, ordering ----

export type AuditTab = 'all' | 'running' | 'ready';

export const isActiveStatus = (s: AuditStatus): boolean =>
  s === 'queued' || s === 'running';

/** The Running tab is queued + running, the pair its badge counts. */
export const TAB_STATUS: Record<AuditTab, string | undefined> = {
  all: undefined,
  running: 'queued,running',
  ready: 'ready',
};

export type AuditSortKey = 'recent' | 'oldest' | 'name' | 'sessions';

export const AUDIT_SORT_CHOICES: ReadonlyArray<{
  value: AuditSortKey;
  label: string;
}> = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name' },
  { value: 'sessions', label: 'Most sessions' },
];

export const SORT_PARAMS: Record<
  AuditSortKey,
  { sortField: AuditSortField; sortOrder: 'asc' | 'desc' }
> = {
  recent: { sortField: 'created_at', sortOrder: 'desc' },
  oldest: { sortField: 'created_at', sortOrder: 'asc' },
  name: { sortField: 'name', sortOrder: 'asc' },
  sessions: { sortField: 'sessions', sortOrder: 'desc' },
};

export type AuditFieldKey = 'sessions' | 'status' | 'created';

export const AUDIT_FIELD_CHOICES: ReadonlyArray<{
  value: AuditFieldKey;
  label: string;
}> = [
  { value: 'sessions', label: 'Sessions' },
  { value: 'status', label: 'Status' },
  { value: 'created', label: 'Created' },
];

export const DEFAULT_FIELDS: readonly AuditFieldKey[] = [
  'sessions',
  'status',
  'created',
];

/** `full` = audits over full traffic, else a saved segment's id. */
export const FULL_TRAFFIC = 'full';

export interface AuditFilters {
  segment?: string;
  periodDays?: number;
  userId?: number;
  /** the audit covers all of them */
  chapters: ChapterKey[];
}

export const NO_FILTERS: AuditFilters = { chapters: [] };

export const filterCount = (f: AuditFilters): number =>
  (f.segment ? 1 : 0) +
  (f.periodDays ? 1 : 0) +
  (f.userId != null ? 1 : 0) +
  f.chapters.length;

export interface ListQuery {
  tab: AuditTab;
  search: string;
  /** Created window, epoch ms; 0 = unbounded. */
  startDate: number;
  endDate: number;
  sort: AuditSortKey;
  page: number;
  pageSize: number;
  filters?: AuditFilters;
}

export function toCountsParams(
  q: Pick<ListQuery, 'search' | 'startDate' | 'endDate'>,
): CountsParams {
  return {
    search: q.search.trim() || undefined,
    startDate: q.startDate || undefined,
    endDate: q.endDate || undefined,
  };
}

export function toListParams(q: ListQuery): ListAuditsParams {
  const f = q.filters ?? NO_FILTERS;
  return {
    ...toCountsParams(q),
    status: TAB_STATUS[q.tab],
    segmentId: f.segment || undefined,
    periodDays: f.periodDays || undefined,
    userId: f.userId ?? undefined,
    chapters: f.chapters.length
      ? CHAPTERS.filter((c) => f.chapters.includes(c.key))
          .map((c) => c.key)
          .join(',')
      : undefined,
    ...SORT_PARAMS[q.sort],
    limit: q.pageSize,
    offset: Math.max(0, q.page - 1) * q.pageSize,
  };
}

// ---- New audit ----

export type AuditScope = 'full' | 'segments';

/** Segments mode compares up to this many saved segments against all traffic. */
export const MAX_SEGMENTS = 3;

export interface AuditDraft {
  name: string;
  scope: AuditScope;
  /** Segments mode: 1-3 saved segments. */
  segmentIds: string[];
  /** Full traffic narrowed by these (FilterItem.toJson() shape). */
  filters: AuditFilter[];
  periodDays: PeriodDays;
  /** wins over `periodDays` */
  custom?: CustomRange;
  chapters: ChapterKey[];
}

export const emptyDraft = (hasAi: boolean): AuditDraft => ({
  name: '',
  scope: 'full',
  segmentIds: [],
  filters: [],
  periodDays: DEFAULT_PERIOD,
  chapters: usableChapters(hasAi),
});

/** The analytics report; also the estimate's body. */
export function toCreateRequest(
  draft: AuditDraft,
  hasAi: boolean,
): CreateAuditRequest {
  const segments = draft.scope === 'segments';
  const filters = segments ? [] : draft.filters;
  return {
    name: draft.name.trim() || undefined,
    type: 'analytics',
    periodDays: draft.periodDays,
    // no email for now (OR-4041)
    notify: false,
    segmentIds:
      segments && draft.segmentIds.length
        ? draft.segmentIds.slice(0, MAX_SEGMENTS)
        : undefined,
    filter: filters.length ? { filters, eventsOrder: 'then' } : undefined,
    custom: draft.custom
      ? { from: draft.custom.from, to: draft.custom.to }
      : undefined,
    sections: orderChapters(draft.chapters, hasAi),
  };
}

export type DraftProblem =
  'name' | 'segment' | 'unfinishedFilters' | 'sections';

/** Why Generate is disabled, or null. `unfinished` = filter rules still missing a value. */
export function draftProblem(
  draft: AuditDraft,
  hasAi: boolean,
  unfinished = 0,
): DraftProblem | null {
  if (!draft.name.trim()) return 'name';
  if (draft.scope === 'segments' && !draft.segmentIds.length) return 'segment';
  if (draft.scope === 'full' && unfinished > 0) return 'unfinishedFilters';
  if (orderChapters(draft.chapters, hasAi).length === 0) return 'sections';
  return null;
}

/** Can the scope be estimated yet (the estimate takes the same body as create). */
export const canEstimate = (draft: AuditDraft): boolean =>
  draft.scope === 'full' || draft.segmentIds.length > 0;

/** The address that opens an audit's report; `slide` is 1-based. */
export function reportLink(auditId: string, slide?: number): string {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set('audit', auditId);
  if (slide != null) url.searchParams.set('slide', String(slide));
  return url.toString();
}

// ---- A list row ----

export class AuditItem {
  readonly raw: Audit;

  readonly id: string;

  readonly name: string;

  readonly status: AuditStatus;

  readonly createdAt: number;

  readonly chapters: ChapterKey[];

  constructor(raw: Audit) {
    this.raw = raw;
    this.id = raw.auditId;
    this.name = raw.name;
    this.status = raw.status;
    this.createdAt = Date.parse(raw.createdAt);
    this.chapters = raw.chapters?.length
      ? raw.chapters
      : raw.typeInputs?.chapters?.length
        ? raw.typeInputs.chapters
        : chaptersOfSections(raw.typeInputs?.sections);
  }

  get isActive(): boolean {
    return isActiveStatus(this.status);
  }

  get isReady(): boolean {
    return this.status === 'ready';
  }

  get isFailed(): boolean {
    return this.status === 'failed';
  }

  get isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  get canEdit(): boolean {
    return this.raw.canEdit;
  }

  /** Rerun is refused (409) while the original is queued or running. */
  get canRerun(): boolean {
    return !this.isActive;
  }

  get progress(): number {
    return this.isReady ? 100 : this.raw.progress;
  }

  get segments(): readonly { id: string; name: string }[] {
    return this.raw.segments ?? [];
  }

  /** What was read: the segments compared, a legacy segment, or full traffic. */
  get segmentName(): string {
    if (this.segments.length)
      return this.segments.map((s) => s.name).join(', ');
    return this.raw.segmentId
      ? this.raw.segmentName || 'Segment'
      : 'Full traffic';
  }

  /** Rules that narrowed full traffic; a segment's own rules are not counted. */
  get filterCount(): number {
    return this.segments.length || this.raw.segmentId
      ? 0
      : (this.raw.filter?.filters?.length ?? 0);
  }

  get periodDays(): number {
    return this.raw.periodDays;
  }

  /** The stored window; "Last N days" on audits made before windows were stored. */
  get periodLabel(): string {
    const { periodStart, periodEnd } = this.raw;
    if (!periodStart || !periodEnd) return periodName(this.raw.periodDays);
    const from = Date.parse(periodStart);
    let to = Date.parse(periodEnd);
    // a whole-day window ends at the next midnight
    const end = new Date(to);
    if (end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && to > from)
      to -= 1;
    return rangeLabel(from, to);
  }

  /** "Mobile visitors · 13–19 Nov 2026", "Full traffic, 2 filters · 28 Oct – 3 Nov 2026". */
  get scopeLabel(): string {
    const n = this.filterCount;
    const narrowed = n ? `, ${n} ${n === 1 ? 'filter' : 'filters'}` : '';
    return `${this.segmentName}${narrowed} · ${this.periodLabel}`;
  }

  /** null = no estimate was available, not zero. */
  get sessions(): number | null {
    return this.raw.matchedSessions;
  }

  get users(): number | null {
    return this.raw.matchedUsers ?? null;
  }

  get usesAi(): boolean {
    return this.raw.ai ?? usesAiSections(this.raw.typeInputs?.sections);
  }

  isMine(userId: number | string | undefined): boolean {
    return userId != null && Number(userId) === this.raw.userId;
  }

  creatorLabel(userId: number | string | undefined): string {
    return this.isMine(userId) ? 'You' : this.raw.userName;
  }

  hasArtifact(kind: ArtifactKind): boolean {
    return !!this.raw.artifacts?.[kind];
  }
}

export const toItems = (audits: readonly Audit[]): AuditItem[] =>
  audits.map((a) => new AuditItem(a));
