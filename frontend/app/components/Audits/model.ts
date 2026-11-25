import {
  ArtifactKind,
  Audit,
  AuditFilter,
  AuditSortField,
  AuditStatus,
  CountsParams,
  CreateAuditRequest,
  ListAuditsParams,
  PeriodDays,
  SectionGroup,
  SectionKey,
} from './types';

// ---- Chapters ----
// The six report chapters the UI offers (New audit's Sections, the report's contents).
// Each maps to one API section group; picking a chapter sends all its sections.

export type ChapterKey =
  'web' | 'usage' | 'errors' | 'retention' | 'ux' | 'journeys';

export interface Chapter {
  key: ChapterKey;
  group: SectionGroup;
  name: string;
  /** A few words for a one-line row. */
  brief: string;
  hint: string;
  /** Needs Armada (AI) access to be picked. */
  ai: boolean;
  sections: readonly SectionKey[];
}

export const CHAPTERS: readonly Chapter[] = [
  {
    key: 'web',
    group: 'web',
    name: 'Web analytics',
    brief: 'Traffic, pages, referrers, devices',
    hint: 'Sessions, users, top pages, referrers, countries, browsers and devices',
    ai: false,
    sections: ['web.numbers', 'web.tops'],
  },
  {
    key: 'usage',
    group: 'product',
    name: 'Product usage',
    brief: 'Clicks, events, time spent, plans',
    hint: 'Top clicks, events, time spent, plans and which features each group uses',
    ai: false,
    sections: ['product.tops', 'product.features'],
  },
  {
    key: 'errors',
    group: 'errors',
    name: 'Errors and performance',
    brief: 'Errors, failed requests, Web Vitals',
    hint: 'Error rates, top errors and failed requests, slowest requests and pages, Web Vitals',
    ai: false,
    sections: ['errors.numbers', 'errors.tops', 'errors.vitals'],
  },
  {
    key: 'retention',
    group: 'adoption',
    name: 'Features and retention',
    brief: 'Feature use and who comes back',
    hint: 'Popularity, frequency and intensity of the top features, and who comes back',
    ai: false,
    sections: ['adoption.features', 'adoption.retention'],
  },
  {
    key: 'ux',
    group: 'ux',
    name: 'UX and frustrations',
    brief: 'Rage clicks, crashes, quick wins',
    hint: 'Dead and rage clicks, crashes, plus the frustrations found and quick wins',
    ai: true,
    sections: ['ux.numbers', 'ux.frustrations', 'ux.quickwins'],
  },
  {
    key: 'journeys',
    group: 'journeys',
    name: 'Issues and journeys',
    brief: 'Journeys and the issues in them',
    hint: 'Why people come, the steps they take and the issues that hit them most',
    ai: true,
    sections: [
      'journeys.overview',
      'journeys.popular',
      'journeys.actions',
      'journeys.issues',
    ],
  },
];

export const ALL_CHAPTERS: readonly ChapterKey[] = CHAPTERS.map((c) => c.key);

const chapterByKey = new Map(CHAPTERS.map((c) => [c.key, c]));
const chapterByGroup = new Map(CHAPTERS.map((c) => [c.group, c]));

export const chapterOf = (key: ChapterKey): Chapter =>
  chapterByKey.get(key) as Chapter;

export const chapterOfGroup = (group: SectionGroup): Chapter | undefined =>
  chapterByGroup.get(group);

export const sectionGroup = (key: SectionKey): SectionGroup =>
  key.slice(0, key.indexOf('.')) as SectionGroup;

/** The chapters an account may pick. */
export const usableChapters = (hasAi: boolean): ChapterKey[] =>
  CHAPTERS.filter((c) => hasAi || !c.ai).map((c) => c.key);

/** In report order, whatever order they were picked in; AI chapters dropped without access. */
export const orderChapters = (
  picked: readonly ChapterKey[],
  hasAi: boolean,
): ChapterKey[] => usableChapters(hasAi).filter((k) => picked.includes(k));

export const chapterSections = (
  picked: readonly ChapterKey[],
  hasAi: boolean,
): SectionKey[] =>
  orderChapters(picked, hasAi).flatMap((k) => chapterOf(k).sections);

/** Empty or missing = the API's default (every data section), which touches every chapter. */
export const chaptersOfSections = (
  sections?: readonly SectionKey[] | null,
): ChapterKey[] => {
  if (!sections?.length) return [...ALL_CHAPTERS];
  const groups = new Set(sections.map(sectionGroup));
  return CHAPTERS.filter((c) => groups.has(c.group)).map((c) => c.key);
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

// Design: never more than 30 days (most projects keep 30 days of data); the API's enum is 7/30/90.
export const AUDIT_PERIODS: readonly PeriodDays[] = [
  // 1, // Last 24 hours: not in the API's periodDays enum yet
  7, 30,
];
export const DEFAULT_PERIOD: PeriodDays = 7;

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

/** A report's own days (`meta.period`): "13–19 Nov 2026", "28 Oct – 3 Nov 2026". */
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

// "Most sessions" orders by the API's sample_size: the matched count for an
// analytics audit without AI sections, the AI sample otherwise.
export const SORT_PARAMS: Record<
  AuditSortKey,
  { sortField: AuditSortField; sortOrder: 'asc' | 'desc' }
> = {
  recent: { sortField: 'created_at', sortOrder: 'desc' },
  oldest: { sortField: 'created_at', sortOrder: 'asc' },
  name: { sortField: 'name', sortOrder: 'asc' },
  sessions: { sortField: 'sample_size', sortOrder: 'desc' },
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

export interface ListQuery {
  tab: AuditTab;
  search: string;
  /** Created window, epoch ms; 0 = unbounded. */
  startDate: number;
  endDate: number;
  sort: AuditSortKey;
  page: number;
  pageSize: number;
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
  return {
    ...toCountsParams(q),
    status: TAB_STATUS[q.tab],
    ...SORT_PARAMS[q.sort],
    limit: q.pageSize,
    offset: Math.max(0, q.page - 1) * q.pageSize,
  };
}

// ---- New audit ----

export type AuditScope = 'full' | 'segment';

export interface AuditDraft {
  name: string;
  scope: AuditScope;
  /** One saved search; the API resolves it into the stored filter. */
  segmentId?: string;
  /** Full traffic narrowed by these (FilterItem.toJson() shape). */
  filters: AuditFilter[];
  periodDays: PeriodDays;
  chapters: ChapterKey[];
}

export const emptyDraft = (hasAi: boolean): AuditDraft => ({
  name: '',
  scope: 'full',
  filters: [],
  periodDays: DEFAULT_PERIOD,
  chapters: usableChapters(hasAi),
});

/** The analytics report; also the estimate's body. */
export function toCreateRequest(
  draft: AuditDraft,
  hasAi: boolean,
): CreateAuditRequest {
  const segment = draft.scope === 'segment';
  const filters = segment ? [] : draft.filters;
  return {
    name: draft.name.trim() || undefined,
    type: 'analytics',
    periodDays: draft.periodDays,
    // no email for now (OR-4041); the API defaults to true when omitted
    notify: false,
    segmentId: segment ? draft.segmentId : undefined,
    filter: filters.length ? { filters, eventsOrder: 'then' } : undefined,
    inputs: { sections: chapterSections(draft.chapters, hasAi) },
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
  if (draft.scope === 'segment' && !draft.segmentId) return 'segment';
  if (draft.scope === 'full' && unfinished > 0) return 'unfinishedFilters';
  if (orderChapters(draft.chapters, hasAi).length === 0) return 'sections';
  return null;
}

/** Can the scope be estimated yet (the estimate takes the same body as create). */
export const canEstimate = (draft: AuditDraft): boolean =>
  draft.scope === 'full' || !!draft.segmentId;

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
    this.chapters = chaptersOfSections(raw.typeInputs?.sections);
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

  get segmentName(): string {
    return this.raw.segmentId
      ? this.raw.segmentName || 'Segment'
      : 'Full traffic';
  }

  /** Rules that narrowed full traffic; a segment's own rules are not counted. */
  get filterCount(): number {
    return this.raw.segmentId ? 0 : (this.raw.filter?.filters?.length ?? 0);
  }

  get periodDays(): number {
    return this.raw.periodDays;
  }

  /** The API sends the period's length only; the report carries its real dates. */
  get periodLabel(): string {
    return periodName(this.raw.periodDays);
  }

  /** "Mobile visitors · Last 7 days", "Full traffic, 2 filters · Last 30 days". */
  get scopeLabel(): string {
    const n = this.filterCount;
    const narrowed = n ? `, ${n} ${n === 1 ? 'filter' : 'filters'}` : '';
    return `${this.segmentName}${narrowed} · ${this.periodLabel}`;
  }

  /** null = no estimate was available, not zero. */
  get sessions(): number | null {
    return this.raw.matchedSessions;
  }

  get usesAi(): boolean {
    return usesAiSections(this.raw.typeInputs?.sections);
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
