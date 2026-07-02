// The single seam between the Browser Tests API shapes and the redesigned UI view
// models. Everything the UI renders/edits goes through here; fields with no API
// backing are left empty (see ../../todo.md).
import { HarCategory, HarEntryDetail, parseHar } from './harParser';
import {
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
  RunStatus,
  RunStep,
  StepStatus,
  Test,
  TestCase,
  TestLifecycle,
  TestStatus,
  TestStep,
  TestUpdateRequest,
  UiRunStatus,
} from './types';
import { cronToSchedule, scheduleToCron, stepsToLines } from './utils';

// ---- Tests ----

// pending → draft; approved+cron → active; approved → approved; paused → paused.
// `rejected` has no place in the redesign and is filtered out before mapping.
const lifecycleFromApi = (
  status: TestStatus,
  cron?: string | null,
): TestLifecycle => {
  if (status === 'paused') return 'paused';
  if (status === 'approved') return cron ? 'active' : 'approved';
  return 'draft';
};

// Reverse map for writes. The API has no native draft/active, so draft persists as
// pending and active/approved as approved (the cron distinguishes them).
const lifecycleToApi = (status: TestLifecycle): TestStatus => {
  if (status === 'draft') return 'pending';
  if (status === 'paused') return 'paused';
  return 'approved';
};

const RESOLUTIONS: Resolution[] = ['mobile', 'tablet', 'desktop'];
const toResolution = (s?: unknown): Resolution | undefined =>
  typeof s === 'string' && RESOLUTIONS.includes(s as Resolution)
    ? (s as Resolution)
    : undefined;

export function apiTestToVM(
  test: Test,
  envNameById?: Map<string, string>,
): TestCase {
  const screen = toResolution(test.config?.screen_type);
  return {
    key: test.testId,
    title: test.name,
    steps: stepsToLines(test.steps),
    status: lifecycleFromApi(test.status, test.cron),
    isNew: test.status === 'pending' && !test.lastRunAt,
    environments: test.environments ?? [],
    envNames: envNameById
      ? (test.environments ?? []).map((id) => envNameById.get(id) ?? id)
      : undefined,
    // The API stores a single screen_type; the UI's resolution matrix is capped to it.
    resolutions: screen ? [screen] : undefined,
    schedule: cronToSchedule(test.cron),
    expectedResult: test.expectedResult,
    timeoutSecs: test.timeoutSecs,
    config: test.config,
    lastRunAt: test.lastRunAt ? new Date(test.lastRunAt).getTime() : undefined,
  };
}

// Build a full update request from a VM — the drawers hand back an updated VM and the
// tab persists it wholesale.
export function vmToUpdateRequest(vm: TestCase): TestUpdateRequest {
  // Persist the first chosen resolution into config.screen_type (single-value backend).
  const config = vm.resolutions?.length
    ? { ...(vm.config ?? {}), screen_type: vm.resolutions[0] }
    : vm.config;
  return {
    name: vm.title,
    steps: vm.steps,
    expectedResult: vm.expectedResult,
    cron: scheduleToCron(vm.schedule),
    timeoutSecs: vm.timeoutSecs,
    environments: vm.environments,
    status: lifecycleToApi(vm.status),
    config,
  };
}

// ---- Runs ----

const runStatusFromApi = (status: RunStatus): UiRunStatus => {
  if (status === 'passed') return 'passed';
  if (status === 'dispatched') return 'running';
  return 'failed';
};

const stepStatusFromApi = (status: string): StepStatus => {
  if (status === 'passed') return 'passed';
  if (status === 'failed' || status === 'error') return 'failed';
  if (status === 'skipped') return 'skipped';
  if (status === 'dispatched' || status === 'running') return 'running';
  return 'pending';
};

const stepFromApi = (step: RunStep): TestStep => ({
  step: step.action,
  status: stepStatusFromApi(step.status),
  screenshot: step.screenshot,
});

const runDate = (run: {
  startedAt?: string | null;
  finishedAt?: string | null;
}): number => {
  const at = run.startedAt ?? run.finishedAt;
  return at ? new Date(at).getTime() : Date.now();
};

// A lean list item — no steps. network/console/env/region/tags are still not captured
// by the API (see todo.md); resolution now comes from `screenType`.
export function apiRunToVM(run: RunListItem, testName?: string): RunData {
  return {
    key: run.runId,
    testName: testName ?? run.testId,
    date: runDate(run),
    duration: run.durationMs || undefined,
    status: runStatusFromApi(run.status),
    steps: [],
    resolution: toResolution(run.screenType),
  };
}

// The single-run detail endpoint carries failure info, steps and more.
export function apiRunDetailToVM(detail: RunDetail): RunData {
  const failed = detail.failedStepIndex ?? undefined;
  return {
    key: detail.runId,
    testName: detail.testName ?? detail.testId,
    date: runDate(detail),
    duration: detail.durationMs || undefined,
    status: runStatusFromApi(detail.status),
    steps: (detail.steps ?? []).map(stepFromApi),
    resolution: toResolution(detail.screenType),
    failedStep: failed == null ? undefined : failed,
    error:
      detail.failedStepError ??
      detail.failedStepText ??
      detail.errors?.join('\n'),
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
