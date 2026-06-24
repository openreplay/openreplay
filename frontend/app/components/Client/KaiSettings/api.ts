import { client } from 'App/mstore';

import {
  DeleteSuccess,
  Environment,
  EnvironmentRequest,
  ListAllRunsParams,
  ListEnvironmentsParams,
  ListResponse,
  ListRunsParams,
  ListTestsParams,
  Run,
  RunDetail,
  RunWithSteps,
  Test,
  TestCreateRequest,
  TestUpdateRequest,
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

// Project-wide runs list; each item embeds its steps. Optional `testId` filter.
export function listAllRuns(
  projectId: string | number,
  params?: ListAllRunsParams,
): Promise<ListResponse<RunWithSteps>> {
  return client
    .get(`${base(projectId)}/runs`, params)
    .then(toJson<ListResponse<RunWithSteps>>);
}

export function listRuns(
  projectId: string | number,
  testId: string,
  params?: ListRunsParams,
): Promise<ListResponse<Run>> {
  return client
    .get(`${base(projectId)}/tests/${testId}/runs`, params)
    .then(toJson<ListResponse<Run>>);
}

export function getRun(
  projectId: string | number,
  runId: string,
): Promise<RunDetail> {
  return client.get(`${base(projectId)}/runs/${runId}`).then(toJson<RunDetail>);
}
