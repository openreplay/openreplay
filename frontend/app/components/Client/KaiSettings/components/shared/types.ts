// Types mirror the Browser Tests API (see ../../api.yaml).

export type TestStatus = 'pending' | 'approved' | 'rejected' | 'paused';
export type RunStatus =
  | 'dispatched'
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

export interface Test {
  testId: string;
  projectId: number;
  /** Environment IDs this test runs against. */
  environments: string[];
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
  /** Opaque per-test config (auth, screen_type, ssl_enforce, locale). */
  config?: Record<string, unknown>;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
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
  llmModel?: string | null;
  extractionModel?: string | null;
  fallbackModel?: string | null;
  config?: Record<string, unknown>;
}

export interface TestUpdateRequest {
  name?: string;
  scenario?: string;
  steps?: unknown;
  expectedResult?: string;
  cron?: string | null;
  timeoutSecs?: number;
  environments?: string[];
  status?: TestStatus;
  llmModel?: string | null;
  extractionModel?: string | null;
  fallbackModel?: string | null;
  /** Send the full object to replace it. */
  config?: Record<string, unknown>;
}

export interface Run {
  runId: string;
  testId: string;
  status: RunStatus;
  containerId?: string | null;
  s3Prefix?: string | null;
  /** Viewport the run executed against (mobile/desktop/tablet). */
  screenType: string;
  /** Groups fan-out runs from the same trigger; null if standalone. */
  batchId?: string | null;
  /** How the run was launched (docker/ecs/k8s); null until set. */
  dispatchMode?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs: number;
  costUsd: number;
  finalResult: string;
  stepsCount: number;
}

export interface RunStep {
  stepIndex: number;
  action: string;
  status: string;
  durationMs: number;
  costUsd: number;
  error?: string;
  extractedContent?: string;
  /** URL or storage key. */
  screenshot?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

/** Project-wide runs-list item: a lean summary — omits `steps` and `finalResult`
 *  (fetch those via GET /runs/{runId}). */
export interface RunListItem {
  runId: string;
  testId: string;
  status: RunStatus;
  containerId?: string | null;
  s3Prefix?: string | null;
  screenType: string;
  batchId?: string | null;
  dispatchMode?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs: number;
  costUsd: number;
  stepsCount: number;
}

export interface RunDetail extends Run {
  model?: string;
  testName?: string;
  tokensInput?: number;
  tokensOutput?: number;
  tokensCached?: number;
  tokensTotal?: number;
  /** Null when the run did not fail on a step. */
  failedStepIndex?: number | null;
  failedStepText?: string | null;
  failedStepError?: string | null;
  errors?: string[];
  steps?: RunStep[];
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
  sortField?: 'started_at' | 'duration_ms' | 'cost_usd';
  sortOrder?: SortOrder;
  status?: RunStatus;
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

// ---- UI view models ----
// The redesigned UI works with a richer model than the API stores. Adapters in
// ./adapters map between the two. Fields with no API backing (tags, resolutions,
// regions, alternatives, per-step screenshots, network/console) are UI-only for
// now — see ../../todo.md.

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
}

export interface TestStep {
  step: string;
  status: StepStatus;
  // a step can capture several screenshots; the run drawer shows a carousel.
  shots?: number;
  screenshot?: string;
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
  testName: string;
  date: number; // when the run started (epoch ms)
  duration?: number; // omitted while running
  status: UiRunStatus;
  steps: TestStep[];
  failedStep?: number;
  error?: string;
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
  // The full stored variables record, carried through edits so keys the form doesn't
  // model aren't wiped by the wholesale-replace PUT.
  variables?: Record<string, unknown>;
}
