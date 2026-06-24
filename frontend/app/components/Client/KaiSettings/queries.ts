import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { useStore } from 'App/mstore';

import * as api from './api';
import {
  EnvironmentRequest,
  ListAllRunsParams,
  ListEnvironmentsParams,
  ListRunsParams,
  ListTestsParams,
  TestCreateRequest,
  TestUpdateRequest,
} from './components/shared/types';

// Lets the page-level project selector override which project the queries hit,
// without mutating the globally-active project. Falls back to the active one.
const ProjectContext = React.createContext<string | undefined>(undefined);
export const BrowserTestsProjectProvider = ProjectContext.Provider;

/** Project id shared by every Browser Tests query. */
export function useProjectId(): string {
  const selected = React.useContext(ProjectContext);
  const { projectsStore } = useStore();
  return String(selected ?? projectsStore.activeSiteId ?? '');
}

// Centralised query keys so mutations can invalidate precisely.
export const browserTestsKeys = {
  all: (projectId: string) => ['browser-tests', projectId] as const,
  tests: (projectId: string, params?: ListTestsParams) =>
    ['browser-tests', projectId, 'tests', params ?? {}] as const,
  test: (projectId: string, testId: string) =>
    ['browser-tests', projectId, 'test', testId] as const,
  environments: (projectId: string, params?: ListEnvironmentsParams) =>
    ['browser-tests', projectId, 'environments', params ?? {}] as const,
  allRuns: (projectId: string, params?: ListAllRunsParams) =>
    ['browser-tests', projectId, 'all-runs', params ?? {}] as const,
  runs: (projectId: string, testId: string, params?: ListRunsParams) =>
    ['browser-tests', projectId, 'runs', testId, params ?? {}] as const,
  run: (projectId: string, runId: string) =>
    ['browser-tests', projectId, 'run', runId] as const,
};

// ---- Tests ----

export function useTests(params?: ListTestsParams) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: browserTestsKeys.tests(projectId, params),
    queryFn: () => api.listTests(projectId, params),
    enabled: !!projectId,
  });
}

export function useTest(testId: string | undefined) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: browserTestsKeys.test(projectId, testId ?? ''),
    queryFn: () => api.getTest(projectId, testId as string),
    enabled: !!projectId && !!testId,
  });
}

export function useCreateTest() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TestCreateRequest) => api.createTest(projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.all(projectId),
      });
    },
  });
}

export function useUpdateTest() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      testId,
      body,
    }: {
      testId: string;
      body: TestUpdateRequest;
    }) => api.updateTest(projectId, testId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.all(projectId),
      });
    },
  });
}

export function useDeleteTest() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (testId: string) => api.deleteTest(projectId, testId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.all(projectId),
      });
    },
  });
}

// ---- Environments ----

export function useEnvironments(params?: ListEnvironmentsParams) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: browserTestsKeys.environments(projectId, params),
    queryFn: () => api.listEnvironments(projectId, params),
    enabled: !!projectId,
  });
}

export function useCreateEnvironment() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: EnvironmentRequest) =>
      api.createEnvironment(projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.environments(projectId),
      });
    },
  });
}

export function useUpdateEnvironment() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      environmentId,
      body,
    }: {
      environmentId: string;
      body: EnvironmentRequest;
    }) => api.updateEnvironment(projectId, environmentId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.environments(projectId),
      });
    },
  });
}

export function useDeleteEnvironment() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (environmentId: string) =>
      api.deleteEnvironment(projectId, environmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.environments(projectId),
      });
    },
  });
}

// ---- Runs ----

/** Project-wide runs (all tests by default; pass `testId` to narrow). */
export function useAllRuns(params?: ListAllRunsParams) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: browserTestsKeys.allRuns(projectId, params),
    queryFn: () => api.listAllRuns(projectId, params),
    enabled: !!projectId,
  });
}

export function useRuns(testId: string | undefined, params?: ListRunsParams) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: browserTestsKeys.runs(projectId, testId ?? '', params),
    queryFn: () => api.listRuns(projectId, testId as string, params),
    enabled: !!projectId && !!testId,
  });
}

export function useRun(runId: string | undefined) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: browserTestsKeys.run(projectId, runId ?? ''),
    queryFn: () => api.getRun(projectId, runId as string),
    enabled: !!projectId && !!runId,
  });
}
