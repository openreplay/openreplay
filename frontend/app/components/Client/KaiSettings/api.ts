import { client } from 'App/mstore';

import {
  ActivateVersionRequest,
  BulkResult,
  CountResult,
  DeleteSuccess,
  Environment,
  EnvironmentRequest,
  ListAllRunsParams,
  ListEnvironmentsParams,
  ListResponse,
  ListRunsParams,
  ListTestsParams,
  ListVersionsParams,
  NotificationSettings,
  NotificationSettingsRequest,
  ProjectSettings,
  ProjectSettingsRequest,
  RunDetail,
  RunListItem,
  Test,
  TestCreateRequest,
  TestUpdateRequest,
  TestVersionDetail,
  TestVersionItem,
  TestsBulkRequest,
  TriggerRunResult,
  VersionDiff,
} from './components/shared/types';

// Base path: /v2/{projectId}/browser-tests (the `/v2` prefix is added by the
// API client — `/browser-tests` is registered in its `newApiUrls` list).
const base = (projectId: string | number) => `/${projectId}/browser-tests`;

async function toJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

// ---- Tests ----

export function listTests(
  projectId: string | number,
  params?: ListTestsParams,
): Promise<ListResponse<Test>> {
  return client
    .get(`${base(projectId)}/tests`, params)
    .then(toJson<ListResponse<Test>>);
}

export function getTest(
  projectId: string | number,
  testId: string,
): Promise<Test> {
  return client.get(`${base(projectId)}/tests/${testId}`).then(toJson<Test>);
}

export function createTest(
  projectId: string | number,
  body: TestCreateRequest,
): Promise<Test> {
  return client.post(`${base(projectId)}/tests`, body).then(toJson<Test>);
}

export function updateTest(
  projectId: string | number,
  testId: string,
  body: TestUpdateRequest,
): Promise<Test> {
  return client
    .put(`${base(projectId)}/tests/${testId}`, body)
    .then(toJson<Test>);
}

export function deleteTest(
  projectId: string | number,
  testId: string,
): Promise<DeleteSuccess> {
  return client
    .delete(`${base(projectId)}/tests/${testId}`)
    .then(toJson<DeleteSuccess>);
}

// Bulk update/delete up to 100 tests; ids are processed independently (per-id outcomes).
export function bulkTests(
  projectId: string | number,
  body: TestsBulkRequest,
): Promise<BulkResult> {
  return client
    .patch(`${base(projectId)}/tests`, body)
    .then(toJson<BulkResult>);
}

// Aggregate test counts grouped by `aggregator` (status|tags); same filters as listTests.
export function testCounts(
  projectId: string | number,
  params: { aggregator: 'status' | 'tags' } & Partial<ListTestsParams>,
): Promise<CountResult> {
  return client
    .get(`${base(projectId)}/tests/counts`, params)
    .then(toJson<CountResult>);
}

// ---- Environments ----

export function listEnvironments(
  projectId: string | number,
  params?: ListEnvironmentsParams,
): Promise<ListResponse<Environment>> {
  return client
    .get(`${base(projectId)}/environments`, params)
    .then(toJson<ListResponse<Environment>>);
}

export function getEnvironment(
  projectId: string | number,
  environmentId: string,
): Promise<Environment> {
  return client
    .get(`${base(projectId)}/environments/${environmentId}`)
    .then(toJson<Environment>);
}

export function createEnvironment(
  projectId: string | number,
  body: EnvironmentRequest,
): Promise<Environment> {
  return client
    .post(`${base(projectId)}/environments`, body)
    .then(toJson<Environment>);
}

export function updateEnvironment(
  projectId: string | number,
  environmentId: string,
  body: EnvironmentRequest,
): Promise<Environment> {
  return client
    .put(`${base(projectId)}/environments/${environmentId}`, body)
    .then(toJson<Environment>);
}

export function deleteEnvironment(
  projectId: string | number,
  environmentId: string,
): Promise<DeleteSuccess> {
  return client
    .delete(`${base(projectId)}/environments/${environmentId}`)
    .then(toJson<DeleteSuccess>);
}

// ---- Runs ----

// Project-wide runs list; lean summaries (no steps, no finalResult). Optional
// `testId` filter. Fetch full step detail via getRun.
export function listAllRuns(
  projectId: string | number,
  params?: ListAllRunsParams,
): Promise<ListResponse<RunListItem>> {
  return client
    .get(`${base(projectId)}/runs`, params)
    .then(toJson<ListResponse<RunListItem>>);
}

export function listRuns(
  projectId: string | number,
  testId: string,
  params?: ListRunsParams,
): Promise<ListResponse<RunListItem>> {
  return client
    .get(`${base(projectId)}/tests/${testId}/runs`, params)
    .then(toJson<ListResponse<RunListItem>>);
}

export function getRun(
  projectId: string | number,
  runId: string,
): Promise<RunDetail> {
  return client.get(`${base(projectId)}/runs/${runId}`).then(toJson<RunDetail>);
}

// Aggregate run counts grouped by `aggregator`; same filters as listAllRuns.
export function runCounts(
  projectId: string | number,
  params: {
    aggregator: 'status' | 'screenType' | 'dispatchMode' | 'tags';
  } & Partial<ListAllRunsParams>,
): Promise<CountResult> {
  return client
    .get(`${base(projectId)}/runs/counts`, params)
    .then(toJson<CountResult>);
}

// The run's network.har streamed as JSON text; caller parses via harToNetworkRequests.
export function getRunHar(
  projectId: string | number,
  runId: string,
): Promise<string> {
  return client
    .get(`${base(projectId)}/runs/${runId}/har`)
    .then((r: Response) => r.text());
}

// A run screenshot's fetch path. `name` is the file name (last path segment of a
// results screenshot entry, e.g. "step-2-0.png").
export function runScreenshotPath(
  projectId: string | number,
  runId: string,
  name: string,
): string {
  return `${base(projectId)}/runs/${runId}/screenshots/${name}`;
}

// Screenshot bytes — fetched with the auth header, so an object URL from this blob
// feeds an <img> (a bare authed path can't be an `src`).
export function getRunScreenshot(
  projectId: string | number,
  runId: string,
  name: string,
): Promise<Blob> {
  return client
    .get(runScreenshotPath(projectId, runId, name))
    .then((r: Response) => r.blob());
}

// Trigger a manual run — acknowledges only (the run row appears in the lists on dispatch).
export function triggerRun(
  projectId: string | number,
  testId: string,
): Promise<TriggerRunResult> {
  return client
    .post(`${base(projectId)}/tests/${testId}/trigger`, {})
    .then(toJson<TriggerRunResult>);
}

// ---- Settings & Notifications ----

export function getSettings(
  projectId: string | number,
): Promise<ProjectSettings> {
  return client
    .get(`${base(projectId)}/settings`)
    .then(toJson<ProjectSettings>);
}

export function updateSettings(
  projectId: string | number,
  body: ProjectSettingsRequest,
): Promise<ProjectSettings> {
  return client
    .patch(`${base(projectId)}/settings`, body)
    .then(toJson<ProjectSettings>);
}

export function updateNotifications(
  projectId: string | number,
  body: NotificationSettingsRequest,
): Promise<NotificationSettings> {
  return client
    .patch(`${base(projectId)}/notifications`, body)
    .then(toJson<NotificationSettings>);
}

// ---- Versions ----

export function listVersions(
  projectId: string | number,
  testId: string,
  params?: ListVersionsParams,
): Promise<ListResponse<TestVersionItem>> {
  return client
    .get(`${base(projectId)}/tests/${testId}/versions`, params)
    .then(toJson<ListResponse<TestVersionItem>>);
}

export function diffVersions(
  projectId: string | number,
  testId: string,
): Promise<VersionDiff> {
  return client
    .get(`${base(projectId)}/tests/${testId}/versions/diff`)
    .then(toJson<VersionDiff>);
}

export function getVersion(
  projectId: string | number,
  testId: string,
  versionId: string,
): Promise<TestVersionDetail> {
  return client
    .get(`${base(projectId)}/tests/${testId}/versions/${versionId}`)
    .then(toJson<TestVersionDetail>);
}

// Empty body = full accept; non-empty = partial accept (client-merged steps + decisions).
export function activateVersion(
  projectId: string | number,
  testId: string,
  versionId: string,
  body?: ActivateVersionRequest,
): Promise<Test> {
  return client
    .post(
      `${base(projectId)}/tests/${testId}/versions/${versionId}/activate`,
      body ?? {},
    )
    .then(toJson<Test>);
}

export function dismissVersion(
  projectId: string | number,
  testId: string,
  versionId: string,
): Promise<DeleteSuccess> {
  return client
    .post(
      `${base(projectId)}/tests/${testId}/versions/${versionId}/dismiss`,
      {},
    )
    .then(toJson<DeleteSuccess>);
}
