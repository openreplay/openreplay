// The single seam between the Browser Tests API shapes and the UI view models.
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
  TestMergeRequest,
  TestStatus,
  TestStatusSettable,
  TestStep,
  TestUpdateRequest,
  UiRunStatus,
} from './types';
import { cronToSchedule, scheduleToCron, stepsToLines } from './utils';

// ---- Tests ----

// `rejected` is filtered out of the list before mapping. No cron-derivation — the
// scheduler owns active/paused.
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
  return Array.isArray(arr)
    ? arr.filter((r): r is string => typeof r === 'string')
    : undefined;
};

// Merge the run-matrix picks back into the opaque config, preserving unmodelled keys.
const withMatrixConfig = (
  vm: TestCase,
): Record<string, unknown> | undefined => {
  const base = { ...(vm.config ?? {}) };
  if (vm.resolutions) base.resolutions = vm.resolutions;
  if (vm.regions) base.regions = vm.regions;
  return Object.keys(base).length ? base : undefined;
};

export function apiTestToVM(
  test: Test,
  envNameById?: Map<string, string>,
): TestCase {
  // `changes` are computed from the versions/diff endpoint on demand (TestDrawer).
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
    // no seenAt → the agent's proposal hasn't been opened; show the "new" dot
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
    hasSideEffects: test.hasSideEffects,
    userModified: test.userModified,
    version: test.activeVersion ?? undefined,
    pendingRevision,
    createdAt: test.createdAt ? new Date(test.createdAt).getTime() : undefined,
    lastRunAt: test.lastRunAt ? new Date(test.lastRunAt).getTime() : undefined,
  };
}

// A manual test starts `approved` (skips the draft flow); a duplicate lands as a `draft`.
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
    status: vm.status === 'draft' ? 'draft' : 'approved',
  };
}

// Base = first selected; the merged test is always a draft.
export function vmToMergeRequest(
  vm: TestCase,
  testIds: string[],
  steps: string[],
): TestMergeRequest {
  return {
    testIds,
    name: vm.title,
    steps,
    expectedResult: vm.expectedResult,
    cron: scheduleToCron(vm.schedule),
    timeoutSecs: vm.timeoutSecs,
    environments: vm.environments,
    tags: vm.tags,
    config: withMatrixConfig(vm),
  };
}

// Pass `status` ONLY for a client-settable transition (see `settableTransition`).
// `approved → active` is runner-promoted (scheduling sets cron; the runner flips
// status), so schedule/unschedule must call this WITHOUT a status.
export function vmToUpdateRequest(
  vm: TestCase,
  status?: TestStatusSettable,
  includeSteps = false,
): TestUpdateRequest {
  return {
    name: vm.title,
    tags: vm.tags,
    // no schedule → clear the cron with an empty string (not null) so unscheduling sticks
    cron: scheduleToCron(vm.schedule) ?? '',
    environments: vm.environments,
    // only replace the steps when the user actually edited them this session
    ...(includeSteps ? { steps: vm.steps } : {}),
    config: withMatrixConfig(vm),
    ...(status ? { status } : {}),
  };
}

// The status to actually write, or undefined when the API won't accept it as a client
// transition. approved↔active (schedule/unschedule) is runner-owned → cron only.
export function settableTransition(
  prev: TestLifecycle,
  next: TestLifecycle,
): TestStatusSettable | undefined {
  if (prev === next) return undefined;
  if (prev === 'draft' && next === 'approved') return 'approved';
  if (prev === 'active' && next === 'paused') return 'paused';
  if (prev === 'paused' && next === 'active') return 'active';
  return undefined;
}

// The versions/diff endpoint returns the two step arrays, not a change list. LCS so
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
  if (status === 'dispatched' || status === 'running') return 'running';
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

const lastSegment = (path: string): string => {
  const clean = path.split(/[?#]/)[0];
  return clean.split('/').filter(Boolean).pop() || clean || '/';
};

// A user step expands into one or more agent actions, each with its own screenshot, so
// the row's `screenshots` is the union and its network counts are summed. Paths are
// reduced to the file name the screenshots endpoint takes.
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

// Legacy runs without `user_steps`: group the flat agent steps by `user_step_index` so
// one human step is one row (mapping agent steps 1:1 duplicates rows).
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

// A lean list item — no steps, no network/console. Env name is resolved via the
// optional id→name map (the run carries only environmentId).
export function apiRunToVM(
  run: RunListItem,
  testName?: string,
  envNameById?: Map<string, string>,
): RunData {
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
    region: run.region ?? undefined,
    envName: run.environmentId
      ? (envNameById?.get(run.environmentId) ?? undefined)
      : undefined,
    tags: run.tags,
    dispatchMode: run.dispatchMode ?? undefined,
    batchId: run.batchId ?? undefined,
  };
}

// All step-level detail lives inside the runner's results.json; network comes from the
// streamed HAR (wired in the drawer, not here).
export function apiRunDetailToVM(
  detail: RunDetail,
  envNameById?: Map<string, string>,
): RunData {
  const results = detail.results ?? undefined;
  const agentSteps = Array.isArray(results?.agent_steps)
    ? results!.agent_steps
    : [];
  const steps: TestStep[] =
    results?.user_steps && results.user_steps.length
      ? results.user_steps.map((us) => userStepToVM(us, agentSteps))
      : groupAgentSteps(agentSteps);
  // A "skipped" step whose next step passed can't have been skipped — the flow reached
  // past it — so show it as passed. Applied backward so it cascades through a run of
  // skips. Pure display; it also makes the step counts read N/N.
  {
    let nextPassed = false;
    for (let i = steps.length - 1; i >= 0; i -= 1) {
      if (steps[i].status === 'skipped' && nextPassed)
        steps[i] = { ...steps[i], status: 'passed' };
      nextPassed = steps[i].status === 'passed';
    }
  }
  // The runner reports the failed index directly; otherwise fall back to the first row
  // reporting failed. A run can also fail with no step marked failed (a semantic
  // assertion) — then nothing is highlighted.
  const failed =
    typeof results?.failed_step_index === 'number'
      ? results.failed_step_index
      : steps.findIndex((s) => s.status === 'failed');
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
    region: detail.region ?? undefined,
    envName: detail.environmentId
      ? (envNameById?.get(detail.environmentId) ?? undefined)
      : undefined,
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

// Headers ride in `variables.headers` as a `{ name: value }` object (the runner reads a
// map). Old environments may still hold the legacy `HttpHeader[]`, so tolerate both.
function headersFromVar(raw: unknown): HttpHeader[] | undefined {
  if (Array.isArray(raw)) return raw as HttpHeader[];
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(
      ([name, value]) => ({ name, value: String(value ?? '') }),
    );
  }
  return undefined;
}

export function apiEnvToVM(env: Environment): EnvironmentVM {
  const vars = env.variables ?? {};
  return {
    id: env.environmentId,
    name: env.name,
    url: env.baseUrl,
    username: vars.login as string | undefined,
    password: vars.password as string | undefined,
    headers: headersFromVar(vars.headers),
    ignoreHttpsErrors: vars.ignoreHttpsErrors as boolean | undefined,
    isDefault: env.isDefault,
    isActive: env.isActive,
    variables: env.variables,
  };
}

// Credentials, headers and the SSL flag ride in the environment's non-secret
// `variables`. The PUT replaces `variables` wholesale, so start from the stored record
// and only touch the keys the form manages.
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
  // headers → `{ name: value }` object (last write wins on duplicate names)
  const headers = (vm.headers ?? []).reduce<Record<string, string>>(
    (acc, h) => {
      const name = h.name.trim();
      if (name) acc[name] = h.value;
      return acc;
    },
    {},
  );
  setOrDelete('headers', Object.keys(headers).length ? headers : undefined);
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

// harParser categories map onto the raw `type` strings NetworkPanel's categoryOf() reads.
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
    // base64 bodies (images etc.) aren't useful as a text preview
    response:
      e.content.encoding === 'base64' ? undefined : e.content.text || undefined,
    timing,
  };
};

/** Parse a .HAR file's contents into the requests the run drawer renders; [] when the
 *  input isn't a valid HAR. */
export function harToNetworkRequests(content: string): NetworkRequest[] {
  const { data } = parseHar(content);
  return data ? data.entries.map(harEntryToRequest) : [];
}
