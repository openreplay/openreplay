// The single seam between the Browser Tests API shapes and the redesigned UI view
// models. Everything the UI renders/edits goes through here; fields with no API
// backing are left empty (see ../../todo.md).
import { HarCategory, HarEntryDetail, parseHar } from './harParser';
import {
  ConsoleLog,
  Environment,
  EnvironmentRequest,
  EnvironmentVM,
  HttpHeader,
  NetworkRequest,
  NetworkTiming,
  Resolution,
  RunData,
  RunDetail,
  RunListItem,
  RunResultStep,
  RunResultUserStep,
  RunStatus,
  StepChange,
  StepStatus,
  Test,
  TestCase,
  TestCreateRequest,
  TestLifecycle,
  TestStatus,
  TestStatusSettable,
  TestStep,
  TestUpdateRequest,
  UiRunStatus,
} from './types';
import { cronToSchedule, scheduleToCron, stepsToLines } from './utils';

// ---- Tests ----

// Native statuses now: draft / approved / active / paused (rejected is filtered out of
// the list before mapping). No cron-derivation — the scheduler owns active/paused.
const lifecycleFromApi = (status: TestStatus): TestLifecycle => {
  if (status === 'paused') return 'paused';
  if (status === 'active') return 'active';
  if (status === 'approved') return 'approved';
  return 'draft';
};

const RESOLUTIONS: Resolution[] = ['mobile', 'tablet', 'desktop'];
const toResolution = (s?: unknown): Resolution | undefined =>
  typeof s === 'string' && RESOLUTIONS.includes(s as Resolution)
    ? (s as Resolution)
    : undefined;

// config.resolutions is the validated array; fall back to the legacy single screen_type.
const configResolutions = (
  config?: Record<string, unknown>,
): Resolution[] | undefined => {
  const arr = config?.resolutions;
  if (Array.isArray(arr)) {
    const res = arr.map(toResolution).filter((r): r is Resolution => !!r);
    if (res.length) return res;
  }
  const screen = toResolution(config?.screen_type);
  return screen ? [screen] : undefined;
};

const configRegions = (
  config?: Record<string, unknown>,
): string[] | undefined => {
  const arr = config?.regions;
  return Array.isArray(arr) ? arr.filter((r): r is string => typeof r === 'string') : undefined;
};

// Merge the run-matrix picks back into the opaque config, preserving unmodelled keys.
const withMatrixConfig = (vm: TestCase): Record<string, unknown> | undefined => {
  const base = { ...(vm.config ?? {}) };
  if (vm.resolutions) base.resolutions = vm.resolutions;
  if (vm.regions) base.regions = vm.regions;
  return Object.keys(base).length ? base : undefined;
};

export function apiTestToVM(
  test: Test,
  envNameById?: Map<string, string>,
): TestCase {
  // A pending suggestion → a review-ready pendingRevision. `changes` are computed from
  // the versions/diff endpoint on demand (TestDrawer), so start empty here.
  const pendingRevision = test.suggestion
    ? {
        toVersion: test.suggestion.version,
        detectedAt: new Date(test.suggestion.createdAt).getTime(),
        changes: [],
        versionId: test.suggestion.versionId,
      }
    : undefined;
  return {
    key: test.testId,
    title: test.name,
    steps: stepsToLines(test.steps),
    status: lifecycleFromApi(test.status),
    // no seenAt yet → the agent's proposal hasn't been opened; show the "new" dot
    isNew: test.status === 'draft' && !test.seenAt,
    environments: test.environments ?? [],
    envNames: envNameById
      ? (test.environments ?? []).map((id) => envNameById.get(id) ?? id)
      : undefined,
    resolutions: configResolutions(test.config),
    regions: configRegions(test.config),
    tags: test.tags ?? [],
    schedule: cronToSchedule(test.cron),
    expectedResult: test.expectedResult,
    timeoutSecs: test.timeoutSecs,
    config: test.config,
    needsReview: test.needsReview,
    version: test.activeVersion ?? undefined,
    pendingRevision,
    lastRunAt: test.lastRunAt ? new Date(test.lastRunAt).getTime() : undefined,
  };
}

// Create accepts name/steps/cron/environments/tags/config; the backend seeds status
// `draft`, so a manual test is lifted to `approved` with a follow-up update (see
// TestsTab.commitCreate).
export function vmToCreateRequest(vm: TestCase): TestCreateRequest {
  return {
    name: vm.title,
    steps: vm.steps,
    expectedResult: vm.expectedResult,
    cron: scheduleToCron(vm.schedule),
    timeoutSecs: vm.timeoutSecs,
    environments: vm.environments,
    tags: vm.tags,
    config: withMatrixConfig(vm),
  };
}

// Updatable fields: name / tags / environments / cron / config, plus an optional
// `status` — pass it ONLY for a client-settable transition (see `settableTransition`).
// `approved → active` is runner-promoted (scheduling sets cron; the runner flips status),
// so schedule/unschedule must call this WITHOUT a status.
export function vmToUpdateRequest(
  vm: TestCase,
  status?: TestStatusSettable,
): TestUpdateRequest {
  return {
    name: vm.title,
    tags: vm.tags,
    cron: scheduleToCron(vm.schedule),
    environments: vm.environments,
    config: withMatrixConfig(vm),
    ...(status ? { status } : {}),
  };
}

// The status to actually write for a UI status change, or undefined when the API won't
// accept it as a client transition (api3: draft→approved/rejected, and active⇄paused).
// approved↔active (schedule/unschedule) is runner-owned → undefined (cron only).
export function settableTransition(
  prev: TestLifecycle,
  next: TestLifecycle,
): TestStatusSettable | undefined {
  if (prev === next) return undefined;
  if (prev === 'draft' && next === 'approved') return 'approved';
  if (prev === 'active' && next === 'paused') return 'paused';
  if (prev === 'paused' && next === 'active') return 'active';
  return undefined; // approved↔active (schedule/unschedule) is runner-owned
}

// A client-computed git-style diff between the active steps and the proposed (latest)
// steps — the versions/diff endpoint returns the two arrays, not a change list. LCS so
// unchanged rows stay put; a reworded step reads as a removal + an addition.
export function stepsToChanges(
  active: string[],
  latest: string[],
): StepChange[] {
  const n = active.length;
  const m = latest.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i -= 1)
    for (let j = m - 1; j >= 0; j -= 1)
      dp[i][j] =
        active[i] === latest[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const changes: StepChange[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && active[i] === latest[j]) {
      i += 1;
      j += 1;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      // latest[j] is new — placed after the last active row consumed so far
      changes.push({ type: 'added', afterIndex: i - 1, text: latest[j] });
      j += 1;
    } else {
      changes.push({ type: 'removed', index: i });
      i += 1;
    }
  }
  return changes;
}

// ---- Runs ----

const runStatusFromApi = (status: RunStatus): UiRunStatus => {
  if (status === 'passed') return 'passed';
  if (status === 'dispatched') return 'running';
  return 'failed';
};

const stepStatusFromApi = (status?: string): StepStatus => {
  if (status === 'passed' || status === 'success') return 'passed';
  if (status === 'failed' || status === 'failure' || status === 'error')
    return 'failed';
  if (status === 'skipped') return 'skipped';
  if (status === 'dispatched' || status === 'running') return 'running';
  return 'pending';
};

// A human-authored ("user") step → one UI row. A user step expands into one or more agent
// actions, each with its own screenshot, so the row's `screenshots` is the union and its
// network counts are summed across those actions. Screenshot paths are run-relative and
// reduced to the file name the screenshots endpoint takes
// (GET /runs/{runId}/screenshots/{name}). This is the source of truth when the runner
// provides `user_steps`; `groupAgentSteps` is the legacy fallback.
const userStepToVM = (
  us: RunResultUserStep,
  agentSteps: RunResultStep[],
): TestStep => {
  const actions = (us.agent_steps ?? [])
    .map((i) => agentSteps[i])
    .filter((a): a is RunResultStep => !!a);
  const shots = (
    us.screenshots?.length
      ? us.screenshots
      : actions.map((a) => a.screenshot).filter((s): s is string => !!s)
  ).map(lastSegment);
  return {
    step: us.description || '',
    status: stepStatusFromApi(us.status),
    screenshots: shots.length ? shots : undefined,
    networkRequests:
      actions.reduce((n, a) => n + (a.network_requests ?? 0), 0) || undefined,
    failedRequests:
      actions.reduce((n, a) => n + (a.failed_requests?.length ?? 0), 0) ||
      undefined,
  };
};

// Legacy runs without `user_steps`: group the flat agent steps by their `user_step_index`
// so the several agent actions of one human step collapse into a single row (this avoids
// the duplicate-row artefact of mapping agent steps 1:1).
const groupAgentSteps = (agentSteps: RunResultStep[]): TestStep[] => {
  const order: (number | string)[] = [];
  const groups = new Map<number | string, RunResultStep[]>();
  agentSteps.forEach((a, i) => {
    const key = a.user_step_index ?? `agent-${a.index ?? i}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(a);
  });
  return order.map((key) => {
    const actions = groups.get(key)!;
    const shots = actions
      .map((a) => a.screenshot)
      .filter((s): s is string => !!s)
      .map(lastSegment);
    const failed = actions.some(
      (a) => stepStatusFromApi(a.status) === 'failed',
    );
    return {
      step: actions[0].user_step_text || actions[0].action || '',
      status: failed ? 'failed' : stepStatusFromApi(actions[0].status),
      screenshots: shots.length ? shots : undefined,
      networkRequests:
        actions.reduce((n, a) => n + (a.network_requests ?? 0), 0) || undefined,
      failedRequests:
        actions.reduce((n, a) => n + (a.failed_requests?.length ?? 0), 0) ||
        undefined,
    };
  });
};

const runDate = (run: {
  startedAt?: string | null;
  finishedAt?: string | null;
}): number => {
  const at = run.startedAt ?? run.finishedAt;
  return at ? new Date(at).getTime() : Date.now();
};

// A lean list item — no steps. network/console aren't captured in the list; resolution
// comes from `screenType`, tags ride along from the owning test.
export function apiRunToVM(run: RunListItem, testName?: string): RunData {
  return {
    key: run.runId,
    testId: run.testId,
    testName: testName ?? run.testName ?? run.testId,
    version: run.version ?? undefined,
    date: runDate(run),
    duration: run.durationMs || undefined,
    status: runStatusFromApi(run.status),
    steps: [],
    resolution: toResolution(run.screenType),
    tags: run.tags,
    dispatchMode: run.dispatchMode ?? undefined,
    batchId: run.batchId ?? undefined,
  };
}

// The single-run detail: all step-level detail lives inside the runner's results.json
// (`results`); network comes from the streamed HAR (wired in the drawer, not here).
export function apiRunDetailToVM(detail: RunDetail): RunData {
  const results = detail.results ?? undefined;
  const agentSteps = Array.isArray(results?.agent_steps)
    ? results!.agent_steps
    : [];
  // Prefer the human `user_steps` (one row per authored step); fall back to grouping the
  // flat agent steps for older runs that predate it.
  const steps: TestStep[] =
    results?.user_steps && results.user_steps.length
      ? results.user_steps.map((us) => userStepToVM(us, agentSteps))
      : groupAgentSteps(agentSteps);
  // the runner reports the failed step index directly (into user_steps); otherwise fall
  // back to the first row that reports failed. A run can also fail with no single step
  // marked failed (a semantic assertion) — then nothing is highlighted.
  const failed =
    typeof results?.failed_step_index === 'number'
      ? results.failed_step_index
      : steps.findIndex((s) => s.status === 'failed');
  // runner-captured errors + page JS errors surface in the Console panel
  const logs: ConsoleLog[] = [
    ...(results?.errors ?? []),
    ...(results?.js_errors ?? []),
  ]
    .filter((m): m is string => typeof m === 'string' && m.trim() !== '')
    .map((text) => ({ level: 'error', text, time: 0 }));
  return {
    key: detail.runId,
    testId: detail.testId,
    testName: detail.testName ?? detail.testId,
    version: detail.version ?? undefined,
    date: runDate(detail),
    duration:
      detail.durationMs || (results?.duration_ms as number) || undefined,
    status: runStatusFromApi(detail.status),
    steps,
    resolution: toResolution(detail.screenType),
    tags: detail.tags,
    failedStep: failed >= 0 && failed < steps.length ? failed : undefined,
    summary: results?.final_result,
    // the failed step's error (errors[] is often empty now); joined errors as a fallback
    error:
      results?.failed_step_error ||
      (results?.errors?.length ? results.errors.join('\n') : undefined),
    console: logs.length ? logs : undefined,
    dispatchMode: detail.dispatchMode ?? undefined,
    batchId: detail.batchId ?? undefined,
  };
}

// ---- Environments ----

export function apiEnvToVM(env: Environment): EnvironmentVM {
  const vars = env.variables ?? {};
  return {
    id: env.environmentId,
    name: env.name,
    url: env.baseUrl,
    username: vars.login as string | undefined,
    password: vars.password as string | undefined,
    headers: (vars.headers as HttpHeader[] | undefined) ?? undefined,
    ignoreHttpsErrors: vars.ignoreHttpsErrors as boolean | undefined,
    isDefault: env.isDefault,
    isActive: env.isActive,
    variables: env.variables,
  };
}

// Credentials, headers and the SSL flag ride along in the environment's non-secret
// `variables` record (the agent honouring headers/SSL is a backend TODO). The PUT
// replaces `variables` wholesale, so start from the stored record and only touch the
// keys the form manages — keys it doesn't model are preserved.
export function envFormToRequest(
  vm: Omit<EnvironmentVM, 'id'>,
): EnvironmentRequest {
  const variables: Record<string, unknown> = { ...(vm.variables ?? {}) };
  const setOrDelete = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === false) {
      delete variables[key];
    } else {
      variables[key] = value;
    }
  };
  setOrDelete('login', vm.username?.trim() || undefined);
  setOrDelete('password', vm.password?.trim() || undefined);
  const headers = (vm.headers ?? []).filter((h) => h.name.trim());
  setOrDelete('headers', headers.length ? headers : undefined);
  setOrDelete('ignoreHttpsErrors', vm.ignoreHttpsErrors || undefined);
  return {
    name: vm.name.trim(),
    baseUrl: vm.url.trim(),
    variables,
    isDefault: vm.isDefault,
    // omit when undefined so a create defaults to active and an edit leaves it unchanged
    ...(vm.isActive === undefined ? {} : { isActive: vm.isActive }),
  };
}

// ---- Network (HAR) ----

// The run drawer's NetworkPanel renders NetworkRequest[]; harParser categories map onto
// the raw `type` strings NetworkPanel's own categoryOf() understands.
const HAR_CAT_TO_TYPE: Record<HarCategory, string> = {
  xhr: 'xhr',
  js: 'script',
  css: 'stylesheet',
  img: 'img',
  media: 'media',
  font: 'font',
  doc: 'document',
  other: 'other',
};

const lastSegment = (path: string): string => {
  const clean = path.split(/[?#]/)[0];
  return clean.split('/').filter(Boolean).pop() || clean || '/';
};

const harEntryToRequest = (e: HarEntryDetail): NetworkRequest => {
  // HAR splits waiting/download; NetworkPanel shows ttfb (=wait) and download (=receive).
  const timing: NetworkTiming = {
    dns: e.timings.dns || undefined,
    connect: e.timings.connect || undefined,
    ssl: e.timings.ssl || undefined,
    ttfb: e.timings.wait || undefined,
    download: e.timings.receive || undefined,
  };
  return {
    method: e.method,
    url: e.url,
    name: lastSegment(e.path),
    type: HAR_CAT_TO_TYPE[e.category],
    status: e.status,
    size: e.sizeBytes || undefined,
    duration: e.time,
    time: e.offsetMs,
    ip: e.serverIPAddress || undefined,
    protocol: e.httpVersion || undefined,
    requestHeaders: e.requestHeaders,
    responseHeaders: e.responseHeaders,
    payload: e.postData?.text || undefined,
    // base64 bodies (images etc.) aren't useful as a text preview — skip.
    response:
      e.content.encoding === 'base64' ? undefined : e.content.text || undefined,
    timing,
  };
};

// Parse a .HAR file's contents into the NetworkRequest[] the run drawer renders.
// Returns [] when the input isn't a valid HAR.
export function harToNetworkRequests(content: string): NetworkRequest[] {
  const { data } = parseHar(content);
  return data ? data.entries.map(harEntryToRequest) : [];
}
