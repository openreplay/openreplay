import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { useStore } from 'App/mstore';

import * as api from './api';
import {
  ActivateVersionRequest,
  EnvironmentRequest,
  ListAllRunsParams,
  ListEnvironmentsParams,
  ListRunsParams,
  ListTestsParams,
  NotificationSettingsRequest,
  ProjectSettingsRequest,
  Resolution,
  RunDefaults,
  TestCreateRequest,
  TestUpdateRequest,
  TestsBulkRequest,
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
  runHar: (projectId: string, runId: string) =>
    ['browser-tests', projectId, 'run-har', runId] as const,
  testCounts: (projectId: string, aggregator: string, params?: unknown) =>
    ['browser-tests', projectId, 'test-counts', aggregator, params ?? {}] as const,
  runCounts: (projectId: string, aggregator: string, params?: unknown) =>
    ['browser-tests', projectId, 'run-counts', aggregator, params ?? {}] as const,
  versionDiff: (projectId: string, testId: string) =>
    ['browser-tests', projectId, 'version-diff', testId] as const,
  versions: (projectId: string, testId: string) =>
    ['browser-tests', projectId, 'versions', testId] as const,
  version: (projectId: string, testId: string, versionId: string) =>
    ['browser-tests', projectId, 'version', testId, versionId] as const,
  settings: (projectId: string) =>
    ['browser-tests', projectId, 'settings'] as const,
  notifications: (projectId: string) =>
    ['browser-tests', projectId, 'notifications'] as const,
};

// Every GET in this section caches for 10 minutes — fresh (no refetch) and retained while
// unused — so switching tabs / reopening a drawer serves from cache. Mutations still
// invalidate the relevant keys, so writes show up immediately.
const CACHE_MS = 5 * 60 * 1000;
const cacheOpts = { staleTime: CACHE_MS, gcTime: CACHE_MS };

// ---- Tests ----

export function useTests(params?: ListTestsParams) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.tests(projectId, params),
    queryFn: () => api.listTests(projectId, params),
    enabled: !!projectId,
  });
}

/** Absolute test counts grouped by `aggregator` (status | tags), honouring the same
 *  filters as the list — used for the tab badges + the tag filter's full option set. */
export function useTestCounts(
  aggregator: 'status' | 'tags',
  params?: Partial<ListTestsParams>,
) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.testCounts(projectId, aggregator, params),
    queryFn: () => api.testCounts(projectId, { aggregator, ...params }),
    enabled: !!projectId,
  });
}

export function useTest(testId: string | undefined) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
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
    ...cacheOpts,
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
    mutationFn: ({
      environmentId,
      force,
    }: {
      environmentId: string;
      force?: boolean;
    }) => api.deleteEnvironment(projectId, environmentId, force),
    onSuccess: () => {
      // force-delete also pauses referencing tests, so refresh everything
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.all(projectId),
      });
    },
  });
}

// ---- Runs ----

/** Project-wide runs (all tests by default; pass `testId` to narrow). */
export function useAllRuns(params?: ListAllRunsParams) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.allRuns(projectId, params),
    queryFn: () => api.listAllRuns(projectId, params),
    enabled: !!projectId,
  });
}

/** Absolute run counts grouped by `aggregator`, honouring the same filters as the list. */
export function useRunCounts(
  aggregator: 'status' | 'screenType' | 'dispatchMode' | 'tags',
  params?: Partial<ListAllRunsParams>,
) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.runCounts(projectId, aggregator, params),
    queryFn: () => api.runCounts(projectId, { aggregator, ...params }),
    enabled: !!projectId,
  });
}

export function useRuns(testId: string | undefined, params?: ListRunsParams) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.runs(projectId, testId ?? '', params),
    queryFn: () => api.listRuns(projectId, testId as string, params),
    enabled: !!projectId && !!testId,
  });
}

export function useRun(runId: string | undefined) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.run(projectId, runId ?? ''),
    queryFn: () => api.getRun(projectId, runId as string),
    enabled: !!projectId && !!runId,
  });
}

/** The run's captured network.har as text (parsed into NetworkRequest[] by the drawer).
 *  404 (no HAR) is expected for many runs, so failures are swallowed to `null`. */
export function useRunHar(runId: string | undefined) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.runHar(projectId, runId ?? ''),
    queryFn: () =>
      api.getRunHar(projectId, runId as string).catch(() => null),
    enabled: !!projectId && !!runId,
    retry: false,
  });
}

export function useTriggerRun() {
  const projectId = useProjectId();
  return useMutation({
    mutationFn: (testId: string) => api.triggerRun(projectId, testId),
  });
}

// ---- Bulk ----

export function useBulkTests() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TestsBulkRequest) => api.bulkTests(projectId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.all(projectId),
      });
    },
  });
}

// ---- Versions ----

/** Active-vs-latest diff, fetched when a test carries a pending suggestion. */
export function useVersionDiff(testId: string | undefined, enabled: boolean) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.versionDiff(projectId, testId ?? ''),
    queryFn: () => api.diffVersions(projectId, testId as string),
    enabled: !!projectId && !!testId && enabled,
    retry: false,
  });
}

/** A test's version history (newest first) — powers the drawer version switcher. */
export function useVersions(testId: string | undefined, enabled = true) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.versions(projectId, testId ?? ''),
    queryFn: () => api.listVersions(projectId, testId as string, { limit: 100 }),
    enabled: !!projectId && !!testId && enabled,
    retry: false,
  });
}

/** One version's full content (steps) — fetched lazily when an older version is viewed. */
export function useVersion(
  testId: string | undefined,
  versionId: string | undefined,
) {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.version(projectId, testId ?? '', versionId ?? ''),
    queryFn: () =>
      api.getVersion(projectId, testId as string, versionId as string),
    enabled: !!projectId && !!testId && !!versionId,
    retry: false,
  });
}

export function useActivateVersion() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      testId,
      versionId,
      body,
    }: {
      testId: string;
      versionId: string;
      body?: ActivateVersionRequest;
    }) => api.activateVersion(projectId, testId, versionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.all(projectId),
      });
    },
  });
}

export function useDismissVersion() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testId, versionId }: { testId: string; versionId: string }) =>
      api.dismissVersion(projectId, testId, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: browserTestsKeys.all(projectId),
      });
    },
  });
}

// ---- Settings & Notifications ----

export function useSettings() {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.settings(projectId),
    queryFn: () => api.getSettings(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateSettings() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProjectSettingsRequest) =>
      api.updateSettings(projectId, body),
    onSuccess: (data) => {
      queryClient.setQueryData(browserTestsKeys.settings(projectId), data);
    },
  });
}

export function useNotifications() {
  const projectId = useProjectId();
  return useQuery({
    ...cacheOpts,
    queryKey: browserTestsKeys.notifications(projectId),
    queryFn: () => api.getNotifications(projectId),
    enabled: !!projectId,
  });
}

/** Project run defaults that pre-fill new drafts / manual tests: default viewport +
 *  region from project settings, default environment from the env flagged `isDefault`. */
export function useRunDefaults(): RunDefaults {
  const { data: settings } = useSettings();
  const { data: envs } = useEnvironments({ limit: 100 });
  const defaultEnv = (envs?.items ?? []).find((e) => e.isDefault);
  return {
    envId: defaultEnv?.environmentId,
    resolution: (settings?.defaultViewport as Resolution) || undefined,
    region: settings?.defaultRegion || undefined,
  };
}

export function useUpdateNotifications() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationSettingsRequest) =>
      api.updateNotifications(projectId, body),
    onSuccess: (data) => {
      queryClient.setQueryData(browserTestsKeys.notifications(projectId), data);
    },
  });
}
