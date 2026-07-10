// Types mirror the Browser Tests API (see ../../api2.yaml).

// Full status set as stored/returned. `active`/`paused` are scheduler/runner-owned and
// never writable via the API; whether a test awaits review is the separate `needsReview`
// flag, not a status.
export type TestStatus =
  | 'draft'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'paused';
// Statuses a client may set (api4 `TestStatusSettable`): draft → approved / rejected, and
// the active ⇄ paused pause/resume toggle (plus same-status no-op). `active` is otherwise
// runner-promoted from `approved`.
export type TestStatusSettable =
  | 'draft'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'paused';
export type RunStatus =
  | 'dispatched'
  | 'running'
  | 'passed'
  | 'failed'
  | 'error'
  | 'timeout';

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface DeleteSuccess {
  success: boolean;
}

export interface Environment {
  environmentId: string;
  projectId: number;
  name: string;
  baseUrl: string;
  /** Non-secret key/value variables. */
  variables: Record<string, unknown>;
  /** At most one default environment per project. */
  isDefault: boolean;
  /** Soft on/off toggle, independent of soft-delete. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentRequest {
  name: string;
  baseUrl: string;
  variables?: Record<string, unknown>;
  /** Setting true demotes any existing default. Omit on update to leave unchanged. */
  isDefault?: boolean;
  /** Defaults to true on create. Omit on update to leave unchanged. */
  isActive?: boolean;
}

/** Pending-suggestion badge embedded in `Test.suggestion`. */
export interface SuggestionSummary {
  versionId: string;
  version: number;
  createdAt: string;
}

/** Lean last-run badge inlined on `Test.lastRun` — saves the drawer a runs round-trip. */
export interface RunSummary {
  runId: string;
  status: RunStatus;
  version?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface Test {
  testId: string;
  projectId: number;
  /** Environment IDs this test runs against. */
  environments: string[];
  tags?: string[];
  name: string;
  scenario: string;
  /** Free-form JSON (array or object). */
  steps?: unknown;
  expectedResult: string;
  /** Standard 5-field cron string, or empty/null. */
  cron?: string | null;
  status: TestStatus;
  timeoutSecs: number;
  /** Per-test LLM override; null ⇒ runner env default. */
  llmModel?: string | null;
  /** Per-test extraction-model override; null ⇒ env default. */
  extractionModel?: string | null;
  fallbackModel?: string | null;
  /** Opaque per-test config; plus validated `resolutions` (desktop|tablet|mobile[]) and
   *  `regions` (eu-central-1|us-east-1[]) keys. */
  config?: Record<string, unknown>;
  /** Runner-owned: a new version is proposed and the project pauses on new revisions. */
  needsReview?: boolean;
  activeVersion?: number | null;
  latestVersion?: number | null;
  /** Non-null when a version awaits review. */
  suggestion?: SuggestionSummary | null;
  /** Inlined summary of the most recent run; null when the test has never run. */
  lastRun?: RunSummary | null;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  /** Null until first GET /tests/{id}; then stamped write-once. Marks unviewed as new. */
  seenAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestCreateRequest {
  name: string;
  scenario?: string;
  steps?: unknown;
  expectedResult?: string;
  cron?: string | null;
  timeoutSecs?: number;
  environments?: string[];
  tags?: string[];
  /** `resolutions`/`regions` keys are enum-validated (invalid → 400). */
  config?: Record<string, unknown>;
  /** Optional seed status; omitted → draft. Only 'draft' or 'approved' accepted. */
  status?: 'draft' | 'approved';
}

// Only these fields are updatable (everything else is create-time only). `status`
// accepts only draft → approved/rejected (active/paused are scheduler-owned).
export interface TestUpdateRequest {
  name?: string;
  status?: TestStatusSettable;
  tags?: string[];
  environments?: string[];
  cron?: string | null;
  /** Send the full object to replace it. */
  config?: Record<string, unknown>;
  /** Escape hatch: send `false` to clear a runner-owned review block with no
   *  activatable/dismissable suggestion. Only `false` is accepted (true → 400). */
  needsReview?: false;
}

/** A runs-list item (project-wide and per-test lists): a lean run summary sourced from
 *  PostgreSQL — appears immediately on dispatch. Full detail via GET /runs/{runId}. */
export interface RunListItem {
  runId: string;
  testId: string;
  testName?: string;
  /** The owning test's tags (joined). */
  tags?: string[];
  status: RunStatus;
  containerId?: string | null;
  s3Prefix?: string | null;
  /** Environment the run executed against; null for runs predating this column. */
  environmentId?: string | null;
  /** Region the run executed in (e.g. eu-central-1); null for older runs. */
  region?: string | null;
  /** Viewport the run executed against (mobile/desktop/tablet); defaults to desktop. */
  screenType: string;
  /** Groups fan-out runs from the same trigger; null if standalone. */
  batchId?: string | null;
  /** How the run was launched (docker/ecs/k8s); null until set. */
  dispatchMode?: string | null;
  /** Test version this run executed against; null for runs predating versioning. */
  version?: number | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  /** finishedAt - startedAt; 0 while the run hasn't finished. */
  durationMs: number;
}

// A network request the runner flagged as failed on a step (from results.json).
export interface RunResultFailedRequest {
  timestamp: number;
  method: string;
  url: string;
  status: number;
  time_ms: number;
}

// One agent step inside the runner's results.json. `status` is the action outcome
// ("success"/"failed"), `screenshot` a run-relative path ("screenshots/step-2-0.png"),
// and `user_step_text` the human step it maps to when present.
export interface RunResultStep {
  index?: number;
  action?: string;
  status?: string;
  duration_ms?: number;
  error?: string | null;
  screenshot?: string | null;
  user_step_index?: number | null;
  user_step_text?: string | null;
  network_requests?: number;
  failed_requests?: RunResultFailedRequest[];
}

// One human-authored ("user") step from results.json. Expands into one or more
// `agent_steps` (indices into RunResults.agent_steps); `screenshots` gathers every shot
// captured across those actions (run-relative paths).
export interface RunResultUserStep {
  index?: number;
  description?: string;
  status?: string;
  agent_steps?: number[];
  error?: string | null;
  screenshots?: string[];
}

// The runner's results.json, attached verbatim. Snake_case (runner-authored); read
// defensively — only the fields the drawer uses are typed.
export interface RunResults {
  success?: boolean;
  status?: string;
  duration_ms?: number;
  /** Human summary, one line per step + an "Overall:" line. */
  final_result?: string;
  errors?: string[];
  js_errors?: string[];
  agent_steps?: RunResultStep[];
  user_steps?: RunResultUserStep[];
  /** Index of the failed step (into `user_steps`), plus its text/error. */
  failed_step_index?: number;
  failed_step_text?: string;
  failed_step_error?: string;
  [k: string]: unknown;
}

/** Single-run response: the lifecycle row plus the runner's results.json from S3. All
 *  result detail (steps, screenshots, errors, final result) lives inside `results`. */
export interface RunDetail extends RunListItem {
  /** The runner's results.json, attached verbatim; null when absent/unreadable. */
  results?: RunResults | null;
}

// ---- List query params ----

export type SortOrder = 'asc' | 'desc';

export interface ListTestsParams {
  page?: number;
  limit?: number;
  sortField?:
    | 'name'
    | 'created_at'
    | 'updated_at'
    | 'last_run_at'
    | 'next_run_at';
  sortOrder?: SortOrder;
  name?: string;
  status?: TestStatus;
  environmentId?: string;
  /** Comma-separated tags; matches tests having any of them. */
  tags?: string;
  /** true → only tests awaiting review; false → only those not awaiting review. */
  needsReview?: boolean;
  from?: string;
  to?: string;
}

export interface ListEnvironmentsParams {
  page?: number;
  limit?: number;
  sortField?: 'name' | 'created_at';
  sortOrder?: SortOrder;
  name?: string;
}

export interface ListRunsParams {
  page?: number;
  limit?: number;
  sortField?: 'started_at' | 'duration_ms';
  sortOrder?: SortOrder;
  /** One RunStatus, or a comma-separated any-of set (e.g. "failed,error,timeout"). */
  status?: string;
  /** Partial (case-insensitive) match on the owning test's name. */
  name?: string;
  /** Comma-separated tags; matches runs whose test has any of them. */
  tags?: string;
  screenType?: string;
  dispatchMode?: string;
  environmentId?: string;
  region?: string;
  batchId?: string;
  /** RFC3339 lower bound on startedAt (inclusive). */
  from?: string;
  /** RFC3339 upper bound on startedAt (inclusive). */
  to?: string;
}

/** Project-wide runs list — same as ListRunsParams plus an optional test filter. */
export interface ListAllRunsParams extends ListRunsParams {
  /** Narrow the list to runs of a single test. */
  testId?: string;
}

export interface ListVersionsParams {
  page?: number;
  limit?: number;
}

// ---- Counts / Settings / Notifications / Trigger / Bulk / Versions ----

export interface CountBucket {
  value: string;
  count: number;
}
export interface CountResult {
  aggregator: string;
  buckets: CountBucket[];
}

export interface TriggerRunResult {
  testId: string;
  status: string;
}

export interface NotificationSettings {
  dailySummary: boolean;
  weeklySummary: boolean;
}
export interface NotificationSettingsRequest {
  dailySummary?: boolean;
  weeklySummary?: boolean;
}

export interface ProjectSettings {
  defaultViewport?: string | null;
  defaultRegion?: string | null;
  pauseOnNewRevisions: boolean;
}
export interface ProjectSettingsRequest {
  /** One of desktop|tablet|mobile ("" clears to null). */
  defaultViewport?: string;
  /** One of eu-central-1|us-east-1 ("" clears to null). */
  defaultRegion?: string;
  pauseOnNewRevisions?: boolean;
}

export interface TestsBulkRequest {
  testIds: string[];
  action: 'update' | 'delete';
  update?: TestUpdateRequest;
}
export interface BulkResult {
  succeeded: string[];
  failed: { testId: string; error: string }[];
}

// A test's content version (API shape — distinct from the UI `TestVersion` snapshot).
export type VersionStatus =
  | 'pending'
  | 'active'
  | 'previous'
  | 'superseded'
  | 'rejected'
  | 'reviewed';
export interface TestVersionItem {
  versionId: string;
  testId: string;
  version: number;
  status: VersionStatus;
  source: 'runner' | 'user';
  originRunId?: string | null;
  reviewedFrom?: string | null;
  createdAt: string;
  activatedAt?: string | null;
}
export interface TestVersionDetail extends TestVersionItem {
  scenario: string;
  steps?: unknown;
  expectedResult: string;
  reviewDecisions?: unknown;
}
export interface VersionSide {
  versionId: string;
  version: number;
  status: string;
  scenario: string;
  steps?: unknown;
  expectedResult: string;
  createdAt: string;
}
export interface VersionDiff {
  active: VersionSide;
  latest: VersionSide;
  changed: { scenario: boolean; steps: boolean; expectedResult: boolean };
}
/** Body of POST .../activate — empty = full accept; non-empty = partial accept. */
export interface ActivateVersionRequest {
  scenario?: string;
  steps?: unknown;
  expectedResult?: string;
  decisions?: unknown;
}

// ---- UI view models ----
// The redesigned UI works with a richer model than the API stores. Adapters in
// ./adapters map between the two. Most fields persist (tags, and resolutions/regions
// via the test's `config`); the ones still without API backing are agent
// `alternatives`, per-step multi-screenshots and the full console stream — see
// ../../todo.md.

// draft → approved → active (scheduled) → paused. `active` is derived from an
// approved test carrying a cron; the API doesn't store these two states natively.
export type TestLifecycle = 'draft' | 'approved' | 'active' | 'paused';
export type RunResult = 'passed' | 'failed';
// A run can still be in flight, hence `running`.
export type UiRunStatus = 'running' | 'passed' | 'failed';
export type StepStatus =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'running'
  | 'pending';

export interface HttpHeader {
  name: string;
  value: string;
}

export type Resolution = 'mobile' | 'tablet' | 'desktop';

// The preset environment / viewport / region (Settings → Default run configuration)
// that pre-fill a new draft's or manually-created test's run settings. Persisted:
// viewport/region on project settings, the default environment via its `isDefault` flag.
export interface RunDefaults {
  envId?: string;
  resolution?: Resolution;
  region?: string;
}

export type ScheduleFreq =
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'custom';

// days: 0=Sun … 6=Sat; dayOfMonth: 1–28 or 0 = "last day" (monthly); time: "HH:mm".
// A null schedule means run-manually-only. `freq` is inferred when absent.
export interface Schedule {
  days: number[];
  time: string;
  freq?: ScheduleFreq;
  dayOfMonth?: number;
}

// An alternative branch the agent observed — rendered as a fork under its step.
export interface TestAlternative {
  afterStep: number;
  note: string;
}

// One proposed step change in a pending revision, authored against the CURRENT step
// list (indices refer to positions in `TestCase.steps`), so applying is order-stable.
// There is no "updated" kind — a reworded step is a remove + an add, git-style.
export type StepChange =
  | { type: 'added'; afterIndex: number; text: string } // -1 = before the first step
  | { type: 'removed'; index: number };

// A saved snapshot of the steps as they were at `version` — powers the version
// switcher and per-step history. Oldest → newest; the current steps are NOT in here.
export interface TestVersion {
  version: number;
  savedAt: number; // epoch ms
  steps: string[];
}

// The flow changed: a new version of the steps is proposed and waits for review.
// While pending, the test reads "Needs review" and (if enabled) scheduled runs pause.
export interface PendingRevision {
  toVersion: number;
  detectedAt: number; // epoch ms
  changes: StepChange[];
  versionId?: string; // API version id backing this suggestion (for activate/dismiss)
}

export interface TestCase {
  key: string;
  title: string;
  steps: string[];
  status: TestLifecycle;
  isNew?: boolean;
  environments?: string[]; // environment ids (source of truth for writes)
  envNames?: string[]; // resolved names, for display
  resolutions?: Resolution[];
  regions?: string[];
  schedule?: Schedule | null;
  tags?: string[]; // up to 3
  alternatives?: TestAlternative[];
  lastResult?: RunResult;
  lastRunAt?: number; // epoch ms
  recent?: RunResult[]; // most-recent-last
  timeoutSecs?: number;
  expectedResult?: string;
  // opaque per-test config, carried through so partial updates don't drop it
  config?: Record<string, unknown>;
  // API `needsReview` flag — the agent flagged this test as awaiting review. Set even
  // when there's no pending version diff (`suggestion`) to review yet.
  needsReview?: boolean;
  // step versioning — steps carry a version (default 1); saved snapshots of older
  // versions live in `history`, and a detected flow change sits in `pendingRevision`
  // until the user reviews it (accept/discard/edit per change → save as vN).
  version?: number;
  history?: TestVersion[];
  pendingRevision?: PendingRevision;
}

export interface TestStep {
  step: string;
  status: StepStatus;
  // a step can capture several screenshots (run-relative names); the drawer shows a
  // carousel over them.
  screenshots?: string[];
  // per-step network activity from the run's results.json (counts only).
  networkRequests?: number;
  failedRequests?: number;
}

export type ConsoleLevel = 'info' | 'warn' | 'error';
export interface ConsoleLog {
  level: ConsoleLevel;
  text: string;
  time: number; // ms into the run
}

export interface NetworkTiming {
  dns?: number;
  connect?: number;
  ssl?: number;
  ttfb?: number;
  download?: number;
}

export interface NetworkRequest {
  method: string;
  url: string;
  name: string;
  type: string; // xhr | fetch | script | stylesheet | img | document | media | font
  status: number; // 0 = failed / no response
  size?: number;
  duration: number;
  time: number; // ms into the run
  ip?: string;
  protocol?: string;
  requestHeaders?: HttpHeader[];
  responseHeaders?: HttpHeader[];
  payload?: string;
  response?: string;
  timing?: NetworkTiming;
}

export interface RunData {
  key: string;
  testId?: string; // owning test — for Rerun (POST /tests/{testId}/trigger)
  testName: string;
  version?: number; // which step version the run executed (default 1)
  date: number; // when the run started (epoch ms)
  duration?: number; // omitted while running
  status: UiRunStatus;
  steps: TestStep[];
  failedStep?: number;
  error?: string;
  /** The runner's human result summary (`results.final_result`). */
  summary?: string;
  /** How the run was launched (docker/ecs/k8s). */
  dispatchMode?: string;
  /** Fan-out group id — non-null when part of a batch trigger. */
  batchId?: string;
  envName?: string;
  resolution?: Resolution;
  region?: string;
  tags?: string[];
  console?: ConsoleLog[];
  network?: NetworkRequest[];
}

// Environment as the redesigned form edits it; maps to the API `Environment`.
export interface EnvironmentVM {
  id: string;
  name: string;
  url: string;
  username?: string;
  password?: string;
  headers?: HttpHeader[];
  ignoreHttpsErrors?: boolean;
  isDefault?: boolean;
  /** Soft on/off toggle, independent of soft-delete. */
  isActive?: boolean;
  // The full stored variables record, carried through edits so keys the form doesn't
  // model aren't wiped by the wholesale-replace PUT.
  variables?: Record<string, unknown>;
}
