// Audits API (saas `backend/docs/audits-api.openapi.yaml`): /v2/{projectId}/audits.
// Responses are bare JSON (no `data` envelope); lists are `{ items, total }`.

export type AuditStatus =
  'queued' | 'running' | 'ready' | 'failed' | 'cancelled';

export type ReportType =
  | 'health'
  | 'flow'
  | 'page'
  | 'uiux'
  | 'reliability'
  | 'speed'
  | 'acquisition'
  | 'adoption'
  | 'paths'
  | 'segment'
  | 'account'
  | 'release'
  | 'analytics';

export type SectionKey =
  | 'web.numbers'
  | 'web.tops'
  | 'product.tops'
  | 'product.features'
  | 'errors.numbers'
  | 'errors.tops'
  | 'errors.vitals'
  | 'ux.numbers'
  | 'ux.frustrations'
  | 'ux.quickwins'
  | 'adoption.features'
  | 'adoption.retention'
  | 'journeys.overview'
  | 'journeys.popular'
  | 'journeys.actions'
  | 'journeys.issues';

/** A report chapter, in report order. */
export type ChapterKey =
  'web' | 'usage' | 'errors' | 'retention' | 'ux' | 'journeys';

/** A section's group: the chapter key (older reports: product / adoption). */
export type SectionGroup = ChapterKey | 'product' | 'adoption';

/** 1 = the rolling last 24 hours; 7 and 30 = whole UTC days up to today. */
export type PeriodDays = 1 | 7 | 30;
export type SampleSize = 500 | 1000 | 2000 | 5000 | 10000;
export type ArtifactKind = 'pdf' | 'slides' | 'html';

// Same shape the sessions search sends (FilterItem.toJson()).
export interface AuditFilter {
  name?: string;
  operator: string;
  value?: string[];
  isEvent?: boolean;
  dataType?: 'string' | 'number' | 'boolean' | 'integer';
  propertyOrder?: 'or' | 'and';
  autoCaptured?: boolean;
  isAction?: boolean;
  actionId?: string;
  isSegment?: boolean;
  searchId?: string;
  filters?: AuditFilter[];
  [key: string]: unknown;
}

export interface FilterGroup {
  filters: AuditFilter[];
  eventsOrder?: 'then' | 'or' | 'and';
}

export interface Matcher {
  events?: string[];
  pages?: string[];
  clicks?: string[];
}

export interface TypeInputs {
  flowName?: string;
  steps?: Array<{ label: string; match: Matcher }>;
  features?: Array<Matcher & { name: string }>;
  goal?: Matcher & { name?: string };
  pages?: string[];
  /** The engine's sections, expanded from `chapters` by the API. */
  sections?: SectionKey[];
  /** Read-only: the chosen chapters in report order. */
  chapters?: ChapterKey[];
  compare?: { splitAt?: string };
  breakdown?: { field?: string; label?: string };
}

export interface Artifacts {
  pdf: boolean;
  slides: boolean;
  html: boolean;
}

export interface Audit {
  auditId: string;
  projectId: number;
  userId: number;
  /** Empty when the creator's account is gone. */
  userName: string;
  name: string;
  /** Legacy single segment. */
  segmentId?: string;
  /** Legacy segment's name; in segments mode the names joined with ", ". */
  segmentName?: string;
  /** Segments mode: compared against all traffic, as they were at create time. */
  segments: AuditSegment[];
  filter: FilterGroup;
  /** Empty only on audits made before report types existed. */
  reportType: ReportType | '';
  typeInputs: TypeInputs;
  /** 1, 7 or 30 (90 on older audits), or a custom range's day count. */
  periodDays: number;
  /** The window read, UTC; null on audits made before windows were stored. */
  periodStart?: string | null;
  periodEnd?: string | null;
  periodCustom: boolean;
  /** In report order. */
  chapters: ChapterKey[];
  /** Uses AI sections. */
  ai: boolean;
  /** Effective sample, may be clamped below `requestedSampleSize`. */
  sampleSize: number;
  requestedSampleSize: SampleSize;
  /** null = no estimate was available, not zero matches. */
  matchedSessions: number | null;
  matchedUsers?: number | null;
  samplePct: number | null;
  processedSessions: number;
  /** 0-100, held at 99 until ready. */
  progress: number;
  status: AuditStatus;
  /** Only when failed. */
  error?: string;
  health: number | null;
  notify: boolean;
  artifacts: Artifacts;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  /** Creator or project admin/owner: may rename, cancel, delete. */
  canEdit: boolean;
}

export interface AuditList {
  items: Audit[];
  total: number;
}

export interface AuditCounts {
  all: number;
  /** queued + running */
  running: number;
  ready: number;
}

export type AuditSortField =
  'created_at' | 'name' | 'health' | 'status' | 'sample_size' | 'sessions';

export interface ListAuditsParams {
  /** Comma-separated statuses, e.g. "queued,running". */
  status?: string;
  search?: string;
  /** Created at or after, epoch ms. */
  startDate?: number;
  endDate?: number;
  /** A saved segment among the audit's segments, or `full` for full traffic. */
  segmentId?: string;
  periodDays?: number;
  userId?: number;
  /** Comma-separated chapter keys; the audit must include all of them. */
  chapters?: string;
  sortField?: AuditSortField;
  sortOrder?: 'asc' | 'desc';
  /** Clamped to 100 by the API. */
  limit?: number;
  offset?: number;
}

export type CountsParams = Pick<
  ListAuditsParams,
  'search' | 'startDate' | 'endDate'
>;

export interface AuditSegment {
  id: string;
  name: string;
}

export interface CreateAuditRequest {
  name?: string;
  /** Legacy; use `segmentIds`. */
  segmentId?: string;
  /** Segments mode: 1-3 distinct saved segments; not with a non-empty `filter`. */
  segmentIds?: string[];
  /** Full traffic mode only. */
  filter?: FilterGroup;
  periodDays: PeriodDays;
  /** Inclusive UTC days (YYYY-MM-DD), at most 30; wins over `periodDays`. */
  custom?: { from: string; to: string };
  /** Analytics: the chapters; omitted = every chapter the project may use. */
  sections?: ChapterKey[];
  /** Optional for `type: analytics` (500 read when an AI section is chosen). */
  sampleSize?: SampleSize;
  /** Defaults to false. */
  notify?: boolean | null;
  /** Omitted = analytics. */
  type?: ReportType;
  inputs?: TypeInputs;
}

export interface PatchAuditRequest {
  name?: string;
  notify?: boolean;
}

export interface Estimate {
  /** null = the count could not be produced in time. */
  matchedSessions: number | null;
  /** null whenever `matchedSessions` is. */
  matchedUsers: number | null;
  trafficPct: number | null;
  periodDays: number;
  periodStart: string;
  periodEnd: string;
  /** The project may use AI sections. */
  aiAvailable: boolean;
  chapters: ChapterKey[];
  /** Segments mode: each segment counted over the window. */
  segments: Array<
    AuditSegment & { sessions: number | null; users: number | null }
  >;
  sampleSize: number;
  reportType: ReportType;
  usesAI: boolean;
}

export interface ArtifactLink {
  url: string;
  /** Seconds until `url` stops working. */
  expiresIn: number;
}

export interface DeleteResult {
  auditId: string;
}

// ---- Report ----

export type Severity = 'critical' | 'major' | 'minor';
export type Tone = 'good' | 'bad' | 'neutral';

export interface Finding {
  severity: Severity;
  title: string;
  detail?: string;
}

export interface Insight {
  text: string;
  /** Phrases of `text` drawn in the accent; empty = its numbers. */
  em?: string[];
  basis?: string;
}

export interface SummaryPoint {
  figure: string;
  tone: Tone;
  lead: string;
  text: string;
}

export interface UnverifiedNumber {
  field?: string;
  number?: string;
}

export interface ReportScope {
  /** `segments`: comparison segments, the scope is still all traffic. */
  kind: 'full' | 'segment' | 'segments';
  name: string;
  /** The compiled filter in words; empty for full traffic. */
  filter?: string;
}

export interface ReportPeriod {
  /** YYYY-MM-DD, whole UTC days; `end` is the last day. */
  start: string;
  end: string;
  days: number;
  requestedDays?: number;
  clamped?: boolean;
  note?: string;
  gaps?: string[];
}

export interface ReportCompare {
  kind?: 'previous';
  label?: string;
  start?: string;
  end?: string;
  /** false: every `prev` is null. */
  available: boolean;
  missingBefore?: string | null;
  gaps?: string[];
}

export interface ReportSample {
  mode?: 'events' | 'journeys';
  matched?: number;
  read?: number;
  reviewed?: number;
}

export interface ReportMeta {
  title: string;
  subtitle: string;
  segmentName?: string;
  periodLabel: string;
  sampleSize: number;
  matchedSessions: number | null;
  generatedAt: string;
  auditId?: string | null;
  auditName?: string;
  projectId?: number;
  projectName?: string;
  orgName?: string;
  createdBy?: string;
  source?: string;
  sessions?: number;
  users?: number;
  projectSessions?: number | null;
  filterDescription?: string;
  scope?: ReportScope;
  period?: ReportPeriod;
  compare?: ReportCompare;
  sample?: ReportSample | null;
  appUrl?: string;
  aiCalls?: number;
  collectorRuns?: number;
  seconds?: number;
}

export interface ReportSummary {
  headline: string;
  body: string;
  findings: Finding[];
  /** v4 with an AI section: the executive summary rows. */
  points?: SummaryPoint[];
  insight?: Insight | null;
  unverified?: UnverifiedNumber[];
}

export interface ScoreDimension {
  key:
    | 'feedback'
    | 'errorRecovery'
    | 'clarity'
    | 'consistency'
    | 'efficiency'
    | 'trust';
  label: string;
  score: number;
  note: string;
}

export interface JourneyStep {
  label: string;
  sessions: number;
  dropSessions: number;
  dropPct: number;
}

export interface ReportJourney {
  steps: JourneyStep[];
  note: string;
  callout: string;
}

export interface ReportTypeInfo {
  key?: ReportType | null;
  title?: string;
  question?: string;
  lead?: Record<string, unknown> | null;
  inputs?: TypeInputs;
  source?: string;
  sections?: SectionKey[];
  sectionsFrom?: string;
}

export interface Fact {
  value: string;
  label: string;
}

/** One value per day; null on a day with no sessions. */
export type Series = Array<number | null> | null;

export interface Metric {
  key: string;
  label: string;
  value: number | null;
  prev: number | null;
  /** `duration` is seconds; `pct` changes in points. */
  unit: 'count' | 'ratio' | 'duration' | 'pct';
  better: 'up' | 'down';
  series: Series;
  prevSeries?: Series;
  sessions?: number;
  split?: { desktop?: number; mobile?: number };
}

export interface NumbersData {
  metrics: Metric[];
  of?: string;
  notes?: Record<string, string>;
}

export type TopListKey =
  | 'pages'
  | 'referrers'
  | 'countries'
  | 'users'
  | 'platforms'
  | 'browsers'
  | 'devices'
  | 'usersByTime'
  | 'clicks'
  | 'events'
  | 'jsErrors'
  | 'failedRequests'
  | 'slowRequests'
  | 'slowPages';

export interface TopRow {
  /** null for an unlabelled control; see `selector`. */
  label?: string | null;
  selector?: string;
  sub?: string;
  code?: string;
  kind?: 'desktop' | 'mobile' | 'unknown';
  page?: string;
  same?: boolean;
  unset?: boolean;
  share?: number;
  sessions?: number;
  views?: number;
  events?: number;
  count?: number;
  time?: number;
  users?: number;
  status?: number;
  avg?: number;
  p75?: number;
}

/** `[key, label, unit]` per value column. */
export type TopColumn = [key: string, label: string, unit: string];

export interface TopList {
  key: TopListKey;
  title: string;
  by: string;
  cols: TopColumn[];
  rows: TopRow[];
  facts: Fact[];
  note?: string;
  labelMono?: boolean;
  subMono?: boolean;
  barOn?: string;
  alt?: boolean;
}

export interface MetadataField {
  key?: string;
  name?: string;
  rows?: Array<{
    label?: string;
    sessions?: number;
    share?: number;
    rate?: number;
    unset?: boolean;
  }>;
  facts?: Fact[];
  note?: string;
}

export interface TopsData {
  lists: TopList[];
  metadata?: {
    title?: string;
    by?: string;
    rate?: boolean;
    fields?: MetadataField[];
  } | null;
}

export interface FeaturesData {
  mode: 'full' | 'segment';
  source?: string;
  rows: Array<{
    name?: string;
    match?: string;
    sessions?: number;
    pct?: number;
    /** Column key -> share of that column's sessions. */
    cells?: Record<string, number>;
  }>;
  columns?: Array<{ key?: string; label?: string; sessions?: number }>;
  facts?: Fact[];
  skipped?: string;
  minSessions?: number;
  tooSmall?: number;
}

export interface VitalDevice {
  n?: number;
  avg?: number;
  prev?: number | null;
  p75?: number;
  p90?: number;
  p99?: number;
  /** % good, needs improvement, poor. */
  dist?: [number, number, number];
}

export interface VitalMetric {
  key: 'dom' | 'ttfb' | 'si' | 'fcp' | 'lcp' | 'cls';
  abbr?: string;
  name?: string;
  unit?: 'ms' | 'cls';
  /** Good up to, poor above. */
  thresholds?: [number, number];
  better?: 'down';
  desktop?: VitalDevice | null;
  mobile?: VitalDevice | null;
}

export interface VitalsData {
  metrics: VitalMetric[];
  loads?: { desktop?: number; mobile?: number };
  loadsAre?: string;
  thresholdsFrom?: string;
}

export interface IssueRow {
  id?: string | null;
  name: string;
  description: string;
  categories?: string[];
  tags?: string[];
  impact: 'High' | 'Medium' | 'Low';
  share: number;
  critical: boolean;
  sessions: number;
  journeys?: string[];
  hl?: boolean;
}

export interface IssuesData {
  rows: IssueRow[];
  analysed: number;
  inScope?: number | null;
  seen: number;
  critical?: number;
  facts?: Fact[];
  highlight?: { rows?: number[]; says?: string } | null;
  empty?: string;
}

export interface QuickWinsData {
  items: Array<{
    title?: string;
    do?: string;
    effort?: 'S' | 'M' | 'L' | null;
  }>;
  facts?: Fact[];
  unverified?: UnverifiedNumber[];
}

export interface FeatureAuditData {
  items: Array<{
    n?: number;
    kind?: 'page' | 'click' | 'event';
    label?: string;
    sub?: string;
    users?: number;
    uses?: number;
    sessions?: number;
    popularity?: number;
    frequency?: number;
    perUser?: number;
  }>;
  users?: number;
  identified?: number;
  uses?: number;
}

export interface RetentionPoint {
  k?: number;
  users?: number;
  of?: number;
  pct?: number;
}

export interface RetentionFirst {
  users?: number;
  returned?: number;
  rate?: number | null;
  prev?: number | null;
}

export interface RetentionData {
  unit: 'day' | 'week';
  days: number;
  users?: number;
  points: RetentionPoint[];
  devices?: { desktop?: RetentionPoint[]; mobile?: RetentionPoint[] };
  first: {
    all?: RetentionFirst | null;
    desktop?: RetentionFirst | null;
    mobile?: RetentionFirst | null;
  };
  gap?: number | null;
  gapWeak?: boolean;
  few?: number;
  facts?: Fact[];
}

export interface Journey {
  name?: string;
  means?: string;
  text?: string;
  sessions?: number;
  visitsPct?: number;
  margin?: number | null;
  estSessions?: number;
  users?: number | null;
  usersPct?: number | null;
  outcomes?: { completed?: number; partly?: number; dropped?: number } | null;
  outcomeOf?: number;
  outcomeBy?: 'people' | 'sessions';
  cells?: number[];
}

export interface JourneyOverviewData {
  text?: string;
  top?: Journey | null;
  count?: number;
  people?: number | null;
  read?: number;
  matched?: number;
  unverified?: UnverifiedNumber[];
  note?: string;
  sample?: ReportSample | null;
}

export interface PopularJourneysData {
  journeys: Journey[];
  columns: Array<{
    key?: string;
    kind?: 'all' | 'segment' | 'meta';
    name?: string;
    metaKey?: string;
    sessions?: number;
    few?: boolean;
  }>;
  restPct?: number;
  more?: number;
  people?: number | null;
  read?: number;
  matched?: number;
  outcomes?: boolean;
  unverified?: UnverifiedNumber[];
  note?: string;
  sample?: ReportSample | null;
  facts?: Fact[];
  groupFacts?: Fact[];
}

export interface CommonActionsData {
  actions: Array<{
    label?: string;
    means?: string;
    sessions?: number;
    pct?: number;
    margin?: number | null;
    estSessions?: number;
  }>;
  read?: number;
  withSteps?: number;
  matched?: number;
  mode?: string;
  note?: string;
  sample?: ReportSample | null;
  facts?: Fact[];
}

interface SectionBase<B extends string, D> {
  key: SectionKey;
  group: SectionGroup;
  kind: 'data' | 'ai';
  block: B;
  title: string;
  compare?: boolean;
  collectors?: string[];
  stages?: string[];
  aiCalls?: number;
  /** Set (with `data: null`) when the section could not be built. */
  error?: string;
  insight?: Insight | null;
  data: D | null;
}

export type AnalyticsSection =
  | SectionBase<'numbers', NumbersData>
  | SectionBase<'tops', TopsData>
  | SectionBase<'features', FeaturesData>
  | SectionBase<'vitals', VitalsData>
  | SectionBase<'frictions' | 'impactfulIssues', IssuesData>
  | SectionBase<'quickwins', QuickWinsData>
  | SectionBase<'featureAudit', FeatureAuditData>
  | SectionBase<'retention', RetentionData>
  | SectionBase<'journeyOverview', JourneyOverviewData>
  | (SectionBase<'popularJourneys', PopularJourneysData> & {
      groupsInsight?: Insight | null;
    })
  | SectionBase<'commonActions', CommonActionsData>;

export type SectionBlock = AnalyticsSection['block'];

export interface Report {
  /** 1 = stub SampleReport, 2/3 = AI report types (untyped extras), 4 = Analytics deck. */
  schemaVersion: 1 | 2 | 3 | 4;
  /** null in v4. */
  health: number | null;
  reportType?: ReportTypeInfo;
  meta: ReportMeta;
  summary: ReportSummary;
  scorecard: ScoreDimension[];
  journey: ReportJourney;
  artifacts: Artifacts;
  /** v4: chosen sections in display order. */
  sections?: AnalyticsSection[];
  method?: Record<string, unknown>;
  [key: string]: unknown;
}
