import { client } from 'App/mstore';
import type FilterItem from 'App/mstore/types/filterItem';

/* Smart Issues REST client — the Go `api` service under /v2/smart-issues.
   See api2.yaml for the full contract.

   NOTE(base-path): /smart-issues is added to `noChalice` in api_client.ts so the
   path resolves at the origin root (…/v2/smart-issues/{projectId}), not through
   the chalice prefix. */

const base = (projectId: string | number) => `/v2/smart-issues/${projectId}`;

// ---- shared enums ----
export type Visibility = 'active' | 'hidden' | 'deleted' | 'all';
export type ListSortBy = 'impact' | 'count' | 'recency' | 'firstSeen';
export type SearchSortBy = 'time' | 'events';
export type SortDir = 'asc' | 'desc';
export type LabelsMatch = 'and' | 'or';

export interface RawLabelRatio {
  name: string;
  /** per-label share of the issue's session count (0-100) */
  ratio: number;
}

/* ---- traffic segments (a saved search the agent can capture/analyse) ----
   A segment is a Data Management saved search with an agent-capture layer. The
   saved search is real; the capture layer — which segments the agent analyses,
   their instructions, the project capture mode — is NOT-YET-BACKED (the stubs
   below resolve empty / no-op until it ships). */
export type CaptureMode = 'full' | 'segments';

export interface SavedSegment {
  id: string;
  name: string;
  /** team-visible (capture-eligible) vs private */
  isPublic: boolean;
  /** owned by the current user (edit/delete) vs a teammate's (toggle only) */
  mine: boolean;
  createdBy: string;
  filters: FilterItem[];
  /** one-line human summary of the query */
  summary: string;
  sessionsCount: number;
  usersCount: number;
  /** total sessions the segment has matched (windowless) */
  totalSessionCount: number;
  updatedAt: number;
  /** the agent is capturing/analysing this segment (server `isCapture`) */
  active: boolean;
  instructions?: string;
  /** ~share of traffic this segment matches (NOT-YET-BACKED, 0 until estimated) */
  trafficPct: number;
  /** ~sessions analysed per day (NOT-YET-BACKED, 0 until estimated) */
  sessionsPerDay: number;
}
/** origin an issue can come from: the full-traffic baseline, or a segment id */
export type IssueOrigin = 'full' | string;

/** the project's capture configuration (NOT-YET-BACKED) */
export interface SegmentCaptureState {
  mode: CaptureMode;
  /** segment ids the agent captures */
  active: string[];
  /** per-segment extra instructions for the agent */
  instructions: Record<string, string>;
}

/* Issue row from POST /smart-issues/{projectId} (and GET …/issue, which
   additionally carries `issueDescription`). */
export interface RawIssue {
  issueName: string;
  impact: number;
  critical: boolean;
  hidden: boolean;
  impactedSessions: number;
  count: number;
  firstSeen: number;
  lastSeen: number;
  /** representative description — only returned by GET …/issue */
  issueDescription?: string;
  issueLabels: RawLabelRatio[];
  journeyLabels: RawLabelRatio[];
  /** capture segments (saved-search ids) the issue was found in, in the window;
      [] = full traffic only */
  segmentIds: string[];
  /** server-assigned category + every category the issue is significant in */
  category?: string;
  categories?: string[];
  /** soft-delete flag + timestamp (epoch-ms) */
  deleted?: boolean;
  deletedAt?: number;
}

/* Session row from POST /smart-issues/{projectId}/search — replay metadata
   merged with issue-specific fields. The schema's `additionalProperties: true`
   means more replay props ride along; we read what the cards need and tolerate
   their absence. */
export interface RawIssueSession {
  sessionId: string;
  projectId?: number;
  startTs?: number;
  duration?: number | null;
  userId?: string | null;
  userUuid?: string;
  description?: string;
  journey?: string;
  /** one-line journey summary — the session-card variation headline */
  journeySummary?: string;
  issueLabels?: (string | { name: string })[];
  journeyLabels?: (string | { name: string })[];
  issueTimestamp?: number | null;
  /** ordered journey steps, `relativeTimestamp` anchored to startTs ([] when
      none / aged past the 1-month TTL) */
  journeySteps?: RawJourneyStep[];
  /** capture segments this session's issue was recorded under */
  segmentIds?: string[];
  /** presigned URL for the thumbnail nearest the issue moment (absent if none) */
  thumbnail?: string;
  /** the thumbnail's offset from session start, ms (only with `thumbnail`) */
  thumbnailTimestamp?: number;
  // replay extras (not enumerated in the schema, present via additionalProperties)
  userBrowser?: string;
  userOs?: string;
  userDeviceType?: string;
  userCountry?: string;
  userCity?: string;
  eventsCount?: number;
  metadata?: Record<string, any> | null;
}

/* One vision-extracted journey step (finetuning.user_journey_steps). */
export interface RawJourneyStep {
  name: string;
  timestamp: number;
  /** offset from session start, ms — what the player seeks to (clamped ≥ 0) */
  relativeTimestamp: number;
}

/* GET …/session/{sessionId}/journey — one session's journey + ordered steps. */
export interface SessionJourney {
  sessionId: number;
  journey: string;
  journeySummary: string;
  journeyLabels: string[];
  startTs: number;
  journeySteps: RawJourneyStep[];
}

/* GET …/journey-tags — a project journey tag (LLM-matched session descriptor). */
export interface RawJourneyTag {
  id: number;
  name: string;
  description: string;
  source: 'predefined' | 'custom';
  createdBy: number | null;
  createdAt: string;
}

export interface ListParams {
  limit?: number;
  page?: number;
  issueLabels?: string[];
  journeyLabels?: string[];
  issueLabelsMatch?: LabelsMatch;
  journeyLabelsMatch?: LabelsMatch;
  /** primary-category tab filter (Errors / UI/UX / Slowness) */
  category?: string;
  sortBy?: ListSortBy;
  sortDir?: SortDir;
  range?: [number, number];
  hidden?: Visibility;
  /** filter to critical issues only */
  critical?: boolean;
  /** filter to specific traffic segments (saved-search ids); [] = full traffic */
  segmentIds?: string[];
  /** `or` => hasAny (default), `and` => hasAll — applied to segmentIds */
  segmentsMatch?: LabelsMatch;
  /** filter to what's relevant to me (my criticals + my segments); NOT-YET-BACKED */
  relevantToMe?: boolean;
  minImpact?: number;
  minCount?: number;
  query?: string;
}

export interface SearchParams {
  query?: string | null;
  issueLabels?: string[];
  journeyLabels?: string[];
  journeyLabelsMatch?: LabelsMatch;
  /** scope the sample to specific traffic segments (saved-search ids) */
  segmentIds?: string[];
  /** `or` => hasAny (default), `and` => hasAll — applied to segmentIds */
  segmentsMatch?: LabelsMatch;
  sortBy?: SearchSortBy;
  sortDir?: SortDir;
  range?: [number, number];
  limit?: number;
  page?: number;
}

export interface Reasons {
  hide: string[];
  criticality: string[];
}

export type IssueOperation =
  | { hide: boolean }
  | { rename: string }
  | { critical: boolean }
  | { restore: true }
  // {} triggers the AI auto-rename branch
  | Record<string, never>;

/** Default window when the caller doesn't scope one: the last 7 days (matches
    the server default). */
const defaultRange = (): [number, number] => [
  Date.now() - 7 * 24 * 60 * 60 * 1000,
  Date.now(),
];

/** POST /smart-issues/{projectId} — paginated, filtered, sorted issue list. */
export async function getIssues(
  projectId: string,
  params: ListParams = {},
): Promise<{
  rows: RawIssue[];
  total: number;
  categoryCounts: Record<string, number> | null;
}> {
  const res = await client.post(base(projectId), {
    limit: params.limit ?? 20,
    page: params.page ?? 1,
    issueLabels: params.issueLabels ?? [],
    journeyLabels: params.journeyLabels ?? [],
    issueLabelsMatch: params.issueLabelsMatch ?? 'and',
    journeyLabelsMatch: params.journeyLabelsMatch ?? 'and',
    sortBy: params.sortBy ?? 'impact',
    sortDir: params.sortDir ?? 'desc',
    range: params.range ?? defaultRange(),
    hidden: params.hidden ?? 'active',
    minImpact: params.minImpact ?? 0,
    minCount: params.minCount ?? 0,
    query: params.query ?? '',
    // primary-category tab filter (own param — NOT an issueLabels match)
    ...(params.category ? { category: params.category } : {}),
    // only include when filtering to criticals; omit means no critical filter
    ...(params.critical ? { critical: true } : {}),
    // scope to specific traffic segments; omit/[] means full traffic
    ...(params.segmentIds?.length
      ? {
          segmentIds: params.segmentIds,
          segmentsMatch: params.segmentsMatch ?? 'or',
        }
      : {}),
    // NOT-YET-BACKED filter — server ignores until implemented
    ...(params.relevantToMe ? { relevantToMe: true } : {}),
  });
  const json = await res.json();
  const rows: RawIssue[] = json.data ?? [];
  return {
    rows,
    total: json.total ?? rows.length,
    categoryCounts: json.categoryCounts ?? null,
  };
}

/** GET /smart-issues/{projectId}/issue?name=… — one issue by name (returns it
    even if hidden). Resolves to null on 404 so callers can render "not found". */
export async function getIssue(
  projectId: string,
  name: string,
  range?: [number, number],
): Promise<RawIssue | null> {
  try {
    const res = await client.get(`${base(projectId)}/issue`, {
      name,
      startMs: range?.[0],
      endMs: range?.[1],
    });
    const json = await res.json();
    return json.data ?? null;
  } catch (e: any) {
    if ((e?.cause as Response)?.status === 404) return null;
    throw e;
  }
}

/** GET /smart-issues/{projectId}/labels — the issue + journey label vocabulary
    for the filter controls. */
export async function getLabels(
  projectId: string,
): Promise<{ issueLabels: string[]; journeyLabels: string[] }> {
  const res = await client.get(`${base(projectId)}/labels`);
  const json = await res.json();
  const data = json.data ?? {};
  return {
    issueLabels: data.issueLabels ?? [],
    journeyLabels: data.journeyLabels ?? [],
  };
}

/** GET /smart-issues/{projectId}/reasons — canonical hide/criticality reason
    lists for the feedback prompts. */
export async function getReasons(projectId: string): Promise<Reasons> {
  const res = await client.get(`${base(projectId)}/reasons`);
  const json = await res.json();
  const data = json.data ?? {};
  return { hide: data.hide ?? [], criticality: data.criticality ?? [] };
}

/* ---- journey tags (real CRUD) ---- */

/** GET /smart-issues/{projectId}/journey-tags — the project's live journey tags. */
export async function listJourneyTags(
  projectId: string,
): Promise<RawJourneyTag[]> {
  const res = await client.get(`${base(projectId)}/journey-tags`);
  const json = await res.json();
  return json.data ?? [];
}

/** POST …/journey-tags — create a tag (409 when the name is taken). Resolves to
    null on 409 so the caller can surface "name taken". */
export async function createJourneyTag(
  projectId: string,
  name: string,
  description: string,
): Promise<RawJourneyTag | null> {
  try {
    const res = await client.post(`${base(projectId)}/journey-tags`, {
      name,
      description,
    });
    const json = await res.json();
    return json.data ?? null;
  } catch (e: any) {
    if ((e?.cause as Response)?.status === 409) return null;
    throw e;
  }
}

/** PATCH …/journey-tags/{tagId} — rename / re-describe (omitted fields kept). */
export async function updateJourneyTag(
  projectId: string,
  tagId: number,
  patch: { name?: string; description?: string },
): Promise<RawJourneyTag | null> {
  try {
    const res = await client.patch(
      `${base(projectId)}/journey-tags/${tagId}`,
      patch,
    );
    const json = await res.json();
    return json.data ?? null;
  } catch (e: any) {
    if ((e?.cause as Response)?.status === 409) return null;
    throw e;
  }
}

/** DELETE …/journey-tags/{tagId} — soft-delete (labelled sessions keep it). */
export const deleteJourneyTag = (projectId: string, tagId: number) =>
  client.delete(`${base(projectId)}/journey-tags/${tagId}`);

/** POST /smart-issues/{projectId}/search — sessions for an issue, replay-enriched.
    A non-null `query` triggers the AI vector + LLM re-rank branch. */
export async function getIssueSessions(
  projectId: string,
  issueName: string,
  opts: SearchParams = {},
): Promise<{ rows: RawIssueSession[]; total: number }> {
  const res = await client.post(`${base(projectId)}/search`, {
    issue: issueName,
    query: opts.query ?? null,
    issueLabels: opts.issueLabels ?? [],
    journeyLabels: opts.journeyLabels ?? [],
    journeyLabelsMatch: opts.journeyLabelsMatch ?? 'and',
    ...(opts.segmentIds?.length
      ? {
          segmentIds: opts.segmentIds,
          segmentsMatch: opts.segmentsMatch ?? 'or',
        }
      : {}),
    sortBy: opts.sortBy ?? 'time',
    sortDir: opts.sortDir ?? 'desc',
    range: opts.range ?? defaultRange(),
    limit: opts.limit ?? 50,
    page: opts.page ?? 1,
  });
  const json = await res.json();
  const rows: RawIssueSession[] = json.data ?? [];
  return { rows, total: json.total ?? rows.length };
}

/** GET /smart-issues/{projectId}/session/{sessionId}/journey — one session's
    journey narrative + ordered steps. Resolves to null on 404 (no journey row,
    or aged past the 1-month TTL). */
export async function getSessionJourney(
  projectId: string,
  sessionId: string,
): Promise<SessionJourney | null> {
  try {
    const res = await client.get(
      `${base(projectId)}/session/${sessionId}/journey`,
    );
    const json = await res.json();
    return json.data ?? null;
  } catch (e: any) {
    if ((e?.cause as Response)?.status === 404) return null;
    throw e;
  }
}

/** PUT /smart-issues/{projectId} — dispatches on `operation`. `reasons`/`note`
    are captured with hide + criticality changes. */
export async function updateIssue(
  projectId: string,
  issueName: string,
  operation: IssueOperation,
  reasons?: string[],
  note?: string,
) {
  return client.put(base(projectId), {
    issue: issueName,
    operation,
    ...(reasons && reasons.length ? { reasons } : {}),
    ...(note ? { note } : {}),
  });
}

export const hideIssue = (
  projectId: string,
  issueName: string,
  reasons?: string[],
  note?: string,
) => updateIssue(projectId, issueName, { hide: true }, reasons, note);

export const unhideIssue = (projectId: string, issueName: string) =>
  updateIssue(projectId, issueName, { hide: false });

export const renameIssue = (
  projectId: string,
  issueName: string,
  newName: string,
) => updateIssue(projectId, issueName, { rename: newName });

export const setIssueCritical = (
  projectId: string,
  issueName: string,
  critical: boolean,
  reasons?: string[],
  note?: string,
) => updateIssue(projectId, issueName, { critical }, reasons, note);

export const restoreIssue = (projectId: string, issueName: string) =>
  updateIssue(projectId, issueName, { restore: true });

/** DELETE /smart-issues/{projectId} — soft-delete (not reversible via the API;
    a `restore` un-deletes it). */
export const deleteIssue = (projectId: string, issueName: string) =>
  client.delete(base(projectId), { issue: issueName });

/* ===========================================================================
   MOCKS — these routes DO NOT EXIST server-side.

   `/segment-capture` (project capture MODE + per-segment agent INSTRUCTIONS) was
   never shipped. To avoid 404 noise we don't call the client — each resolves a
   default / no-op. Capture mode + instructions work optimistically in-session
   but DO NOT persist across reload. Swap for real `client.*` calls once the
   backend ships.

   NB: the per-segment capture flag ("Identify issues in this segment") IS real —
   it persists as `isCapture` on the saved search. Only the capture MODE +
   INSTRUCTIONS here are unbacked, so `active` is left empty. */

/** MOCK (no endpoint): project capture mode + per-segment instructions. */
export const getSegmentCapture = (
  _projectId: string,
): Promise<SegmentCaptureState> =>
  Promise.resolve({ mode: 'full', active: [], instructions: {} });

/** MOCK (no endpoint): set the project capture mode. No-op. */
export const setCaptureMode = (
  _projectId: string,
  _mode: CaptureMode,
): Promise<void> => Promise.resolve();

/** MOCK (no endpoint): per-segment capture flag + instructions. No-op — the
    capture flag persists via the saved search's `isCapture`; instructions have
    no backing yet. */
export const setSegmentCapture = (
  _projectId: string,
  _segmentId: string,
  _patch: { active?: boolean; instructions?: string },
): Promise<void> => Promise.resolve();
