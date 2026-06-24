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
}

export interface Run {
  runId: string;
  testId: string;
  status: RunStatus;
  containerId?: string | null;
  s3Prefix?: string | null;
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

/** A project-wide runs-list item: the list Run fields plus that run's steps. */
export interface RunWithSteps extends Run {
  steps: RunStep[];
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
