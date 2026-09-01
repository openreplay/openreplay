import { client } from 'App/mstore';
import type FilterItem from 'App/mstore/types/filterItem';

/* Smart Issues REST client — the Go `api` service under /v2/smart-issues.
   See api3.yaml for the full contract.

   Issues are addressed by `issueId` (a stable UUID), never by name — names are
   display text and can be renamed.

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

/* One critical-definition an issue matched: the rule id plus its author (null
   once that account is removed — the rule outlives its author). */
export interface RawCriticalMatch {
  definitionId: number;
  userId: number | null;
}

/* Issue row from POST /smart-issues/{projectId} (and GET …/issue, which
   additionally carries `issueDescription`). */
export interface RawIssue {
  /** stable UUID — the identity issues are addressed by */
  issueId: string;
  /** display-formatted name; presentation only, can be renamed */
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
  /** which critical-definitions flagged this issue + who wrote each; empty until
      the backend persists the model's verdict (a known limitation) */
  criticalBy?: RawCriticalMatch[];
  /** vision-model severity ("low"|"medium"|"high"|"critical"|"") */
  level?: string;
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

/* Author of a critical-definition; null once that account is removed (the rule
   outlives its author, so it can never become frozen). */
export interface RawCriticalDefinitionAuthor {
  id: number;
  name: string;
}

/* GET …/critical-definitions — one description of what "critical" means. The
   description IS the rule the vision model matches sessions against. */
export interface RawCriticalDefinition {
  id: number;
  description: string;
  createdBy: RawCriticalDefinitionAuthor | null;
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
  /** "Critical to me" — keep only issues the caller has themselves marked critical */
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
    // keep only issues the caller has marked critical ("Critical to me")
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

/** GET /smart-issues/{projectId}/issue?id=… — one issue by id (returns it even
    if hidden). Resolves to null on 404 so callers can render "not found". */
export async function getIssue(
  projectId: string,
  issueId: string,
  range?: [number, number],
): Promise<RawIssue | null> {
  try {
    const res = await client.get(`${base(projectId)}/issue`, {
      id: issueId,
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

/* ---- critical definitions (real CRUD; author-only edit/delete) ---- */

/** GET …/critical-definitions — the project's descriptions of what's critical. */
export async function listCriticalDefinitions(
  projectId: string,
): Promise<RawCriticalDefinition[]> {
  const res = await client.get(`${base(projectId)}/critical-definitions`);
  const json = await res.json();
  return json.data ?? [];
}

/** POST …/critical-definitions — author a rule (the author is the caller). */
export async function createCriticalDefinition(
  projectId: string,
  description: string,
): Promise<RawCriticalDefinition | null> {
  const res = await client.post(`${base(projectId)}/critical-definitions`, {
    description,
  });
  const json = await res.json();
  return json.data ?? null;
}

/** PATCH …/critical-definitions/{id} — rewrite (403 for non-authors). */
export async function updateCriticalDefinition(
  projectId: string,
  definitionId: number,
  description: string,
): Promise<RawCriticalDefinition | null> {
  const res = await client.patch(
    `${base(projectId)}/critical-definitions/${definitionId}`,
    { description },
  );
  const json = await res.json();
  return json.data ?? null;
}

/** DELETE …/critical-definitions/{id} — hard delete (403 for non-authors);
    issues already flagged keep their flag. */
export const deleteCriticalDefinition = (
  projectId: string,
  definitionId: number,
) => client.delete(`${base(projectId)}/critical-definitions/${definitionId}`);

/** POST /smart-issues/{projectId}/search — sessions for an issue, replay-enriched.
    A non-null `query` triggers the AI vector + LLM re-rank branch. */
export async function getIssueSessions(
  projectId: string,
  issueId: string,
  opts: SearchParams = {},
): Promise<{ rows: RawIssueSession[]; total: number }> {
  const res = await client.post(`${base(projectId)}/search`, {
    issueId,
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
  issueId: string,
  operation: IssueOperation,
  reasons?: string[],
  note?: string,
) {
  return client.put(base(projectId), {
    issueId,
    operation,
    ...(reasons && reasons.length ? { reasons } : {}),
    ...(note ? { note } : {}),
  });
}

export const hideIssue = (
  projectId: string,
  issueId: string,
  reasons?: string[],
  note?: string,
) => updateIssue(projectId, issueId, { hide: true }, reasons, note);

export const unhideIssue = (projectId: string, issueId: string) =>
  updateIssue(projectId, issueId, { hide: false });

export const renameIssue = (
  projectId: string,
  issueId: string,
  newName: string,
) => updateIssue(projectId, issueId, { rename: newName });

export const setIssueCritical = (
  projectId: string,
  issueId: string,
  critical: boolean,
  reasons?: string[],
  note?: string,
) => updateIssue(projectId, issueId, { critical }, reasons, note);

export const restoreIssue = (projectId: string, issueId: string) =>
  updateIssue(projectId, issueId, { restore: true });

/** DELETE /smart-issues/{projectId} — soft-delete (not reversible via the API;
    a `restore` un-deletes it). */
export const deleteIssue = (projectId: string, issueId: string) =>
  client.delete(base(projectId), { issueId });

/* ---- project settings (real; stored in projects.melonade_config) ---- */

export interface ProjectSettings {
  /** true => capture only sessions matching an active capture segment; false =>
      full traffic while keeping the segments defined. Defaults true when unset. */
  captureSegmentsOnly: boolean;
}

/** GET …/settings — project-level capture knobs (defaults, never 404s on unset). */
export async function getProjectSettings(
  projectId: string,
): Promise<ProjectSettings> {
  const res = await client.get(`${base(projectId)}/settings`);
  const json = await res.json();
  return { captureSegmentsOnly: json.data?.captureSegmentsOnly ?? true };
}

/** PATCH …/settings — partial update (omitted fields kept); returns the result. */
export async function updateProjectSettings(
  projectId: string,
  patch: Partial<ProjectSettings>,
): Promise<ProjectSettings> {
  const res = await client.patch(`${base(projectId)}/settings`, patch);
  const json = await res.json();
  return { captureSegmentsOnly: json.data?.captureSegmentsOnly ?? true };
}

/* ---- capture state ----
   Project capture MODE is now real: it maps to `captureSegmentsOnly` in the
   project settings (segments-only <=> true). The per-segment capture FLAG is
   also real (the saved search's `isCapture`). Only per-segment agent
   INSTRUCTIONS are still unbacked — see the setSegmentCapture no-op below. */

/** Project capture mode, derived from the real project settings. `active` /
    `instructions` stay empty here — the active set is read from each saved
    search's `isCapture`, and instructions have no backing yet. */
export const getSegmentCapture = async (
  projectId: string,
): Promise<SegmentCaptureState> => {
  try {
    const { captureSegmentsOnly } = await getProjectSettings(projectId);
    return {
      mode: captureSegmentsOnly ? 'segments' : 'full',
      active: [],
      instructions: {},
    };
  } catch {
    // don't let a settings error break the segment list it loads alongside
    return { mode: 'full', active: [], instructions: {} };
  }
};

/** Set the project capture mode → persists as `captureSegmentsOnly`. */
export const setCaptureMode = (
  projectId: string,
  mode: CaptureMode,
): Promise<void> =>
  updateProjectSettings(projectId, {
    captureSegmentsOnly: mode === 'segments',
  }).then(() => undefined);

/** MOCK (no endpoint): per-segment agent instructions. No-op — the capture flag
    itself persists via the saved search's `isCapture`; instructions are unbacked. */
export const setSegmentCapture = (
  _projectId: string,
  _segmentId: string,
  _patch: { active?: boolean; instructions?: string },
): Promise<void> => Promise.resolve();
