import {
  QueryClient,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import React from 'react';

import useDebouncedValue from 'App/hooks/useDebouncedValue';
import { useStore } from 'App/mstore';

import * as api from './api';
import { AuditItem, isActiveStatus, toItems } from './model';
import {
  ArtifactKind,
  Audit,
  AuditList,
  CountsParams,
  CreateAuditRequest,
  ListAuditsParams,
} from './types';

export function useProjectId(): string {
  const { projectsStore } = useStore();
  return String(projectsStore.activeSiteId ?? '');
}

export const auditsKeys = {
  all: (projectId: string) => ['audits', projectId] as const,
  lists: (projectId: string) => ['audits', projectId, 'list'] as const,
  list: (projectId: string, params: ListAuditsParams) =>
    ['audits', projectId, 'list', params] as const,
  counts: (projectId: string, params?: CountsParams) =>
    ['audits', projectId, 'counts', params ?? {}] as const,
  audit: (projectId: string, auditId: string) =>
    ['audits', projectId, 'audit', auditId] as const,
  report: (projectId: string, auditId: string) =>
    ['audits', projectId, 'report', auditId] as const,
  estimate: (projectId: string, body: string) =>
    ['audits', projectId, 'estimate', body] as const,
};

/** How often lists, counts and an open audit refresh while a job is queued or running. */
export const AUDITS_POLL_MS = 5000;

const anyActive = (items?: readonly Audit[]) =>
  (items ?? []).some((a) => isActiveStatus(a.status));

export interface AuditPage {
  items: AuditItem[];
  total: number;
}

// module-level so react-query memoizes the mapped page per response
const selectPage = (data: AuditList): AuditPage => ({
  items: toItems(data.items ?? []),
  total: data.total ?? 0,
});

export function useAuditList(params: ListAuditsParams) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: auditsKeys.list(projectId, params),
    queryFn: () => api.listAudits(projectId, params),
    enabled: !!projectId,
    select: selectPage,
    // re-keyed by tab/search/page: keep the old rows on screen, skeleton only on first load
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      anyActive(query.state.data?.items) ? AUDITS_POLL_MS : false,
  });
}

export function useAuditCounts(params?: CountsParams) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: auditsKeys.counts(projectId, params),
    queryFn: () => api.auditCounts(projectId, params),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      (query.state.data?.running ?? 0) > 0 ? AUDITS_POLL_MS : false,
  });
}

const selectItem = (data: Audit) => new AuditItem(data);

export function useAudit(auditId: string | undefined) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: auditsKeys.audit(projectId, auditId ?? ''),
    queryFn: () => api.getAudit(projectId, auditId as string),
    enabled: !!projectId && !!auditId,
    select: selectItem,
    refetchInterval: (query) =>
      query.state.data && isActiveStatus(query.state.data.status)
        ? AUDITS_POLL_MS
        : false,
  });
}

/** A ready audit's report never changes; 409 (not ready) is not retried. */
export function useAuditReport(auditId: string | undefined, enabled = true) {
  const projectId = useProjectId();
  return useQuery({
    queryKey: auditsKeys.report(projectId, auditId ?? ''),
    queryFn: () => api.getReport(projectId, auditId as string),
    enabled: !!projectId && !!auditId && enabled,
    staleTime: Infinity,
    retry: (count, error) =>
      api.errorStatus(error) !== 409 &&
      api.errorStatus(error) !== 404 &&
      count < 1,
  });
}

/**
 * Matched sessions for a draft (same body as create), settled for `ms` before it asks.
 * `null` body = not estimable yet. A null `matchedSessions` means the count timed out.
 */
export function useAuditEstimate(
  body: CreateAuditRequest | null,
  ms = 400,
) {
  const projectId = useProjectId();
  const key = useDebouncedValue(body ? JSON.stringify(body) : '', ms);
  return useQuery({
    queryKey: auditsKeys.estimate(projectId, key),
    queryFn: ({ signal }) =>
      api.estimateAudit(projectId, JSON.parse(key), signal),
    enabled: !!projectId && !!key,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

// ---- Cache updates ----

type ListKey = ReturnType<typeof auditsKeys.list>;

const listParamsOf = (key: readonly unknown[]): ListAuditsParams =>
  ((key as ListKey)[3] ?? {}) as ListAuditsParams;

function mapListItems(
  queryClient: QueryClient,
  projectId: string,
  fn: (items: Audit[], params: ListAuditsParams) => Audit[] | null,
) {
  queryClient
    .getQueriesData<AuditList>({ queryKey: auditsKeys.lists(projectId) })
    .forEach(([key, data]) => {
      if (!data) return;
      const next = fn(data.items, listParamsOf(key));
      if (!next) return;
      queryClient.setQueryData<AuditList>(key, {
        items: next,
        total: data.total + (next.length - data.items.length),
      });
    });
}

function replaceAudit(
  queryClient: QueryClient,
  projectId: string,
  audit: Audit,
) {
  mapListItems(queryClient, projectId, (items) =>
    items.some((a) => a.auditId === audit.auditId)
      ? items.map((a) => (a.auditId === audit.auditId ? audit : a))
      : null,
  );
  queryClient.setQueryData(auditsKeys.audit(projectId, audit.auditId), audit);
}

/** A new audit shows at the head of every first page that would list it, before the refetch. */
function prependAudit(
  queryClient: QueryClient,
  projectId: string,
  audit: Audit,
) {
  mapListItems(queryClient, projectId, (items, params) => {
    const first = !params.offset;
    const statusOk =
      !params.status || params.status.split(',').includes(audit.status);
    const newestFirst =
      (params.sortField ?? 'created_at') === 'created_at' &&
      (params.sortOrder ?? 'desc') === 'desc';
    if (!first || !statusOk || !newestFirst || params.search) return null;
    return [audit, ...items.filter((a) => a.auditId !== audit.auditId)];
  });
  queryClient.setQueryData(auditsKeys.audit(projectId, audit.auditId), audit);
}

const invalidateLists = (queryClient: QueryClient, projectId: string) =>
  queryClient.invalidateQueries({
    queryKey: auditsKeys.all(projectId),
    predicate: (q) => q.queryKey[2] === 'list' || q.queryKey[2] === 'counts',
  });

// ---- Mutations ----

export function useCreateAudit() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAuditRequest) =>
      api.createAudit(projectId, body),
    onSuccess: (audit) => {
      prependAudit(queryClient, projectId, audit);
      void invalidateLists(queryClient, projectId);
    },
  });
}

export function useRenameAudit() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ auditId, name }: { auditId: string; name: string }) =>
      api.patchAudit(projectId, auditId, { name }),
    onSuccess: (audit) => replaceAudit(queryClient, projectId, audit),
  });
}

export function useCancelAudit() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auditId: string) => api.cancelAudit(projectId, auditId),
    onSuccess: (audit) => {
      replaceAudit(queryClient, projectId, audit);
      void invalidateLists(queryClient, projectId);
    },
  });
}

export function useRerunAudit() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auditId: string) => api.rerunAudit(projectId, auditId),
    onSuccess: (audit) => {
      prependAudit(queryClient, projectId, audit);
      void invalidateLists(queryClient, projectId);
    },
  });
}

export function useDeleteAudit() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auditId: string) => api.deleteAudit(projectId, auditId),
    onSuccess: (_res, auditId) => {
      mapListItems(queryClient, projectId, (items) =>
        items.some((a) => a.auditId === auditId)
          ? items.filter((a) => a.auditId !== auditId)
          : null,
      );
      queryClient.removeQueries({
        queryKey: auditsKeys.audit(projectId, auditId),
      });
      queryClient.removeQueries({
        queryKey: auditsKeys.report(projectId, auditId),
      });
      void invalidateLists(queryClient, projectId);
    },
  });
}

/**
 * Opens a report file (presigned, short-lived) in a new tab. The tab is opened inside the
 * click, before the link is fetched, so popup blockers let it through.
 */
export function useOpenArtifact() {
  const projectId = useProjectId();
  const mutation = useMutation({
    mutationFn: ({ auditId, kind }: { auditId: string; kind: ArtifactKind }) =>
      api.getArtifactLink(projectId, auditId, kind),
  });
  const open = React.useCallback(
    (auditId: string, kind: ArtifactKind) => {
      const tab = window.open('', '_blank');
      mutation.mutate(
        { auditId, kind },
        {
          onSuccess: ({ url }) => {
            if (tab) tab.location.href = url;
            else window.location.assign(url);
          },
          onError: () => tab?.close(),
        },
      );
    },
    [mutation.mutate],
  );
  return { open, ...mutation };
}

/**
 * Calls `onLanded` once for each audit seen active before and finished (ready, failed or
 * cancelled) now, and refreshes the other tabs and the counts.
 */
export function useAuditLandings(
  items: readonly AuditItem[] | undefined,
  onLanded: (audit: AuditItem) => void,
) {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const active = React.useRef<Set<string>>(new Set());
  const callback = React.useRef(onLanded);
  React.useEffect(() => {
    callback.current = onLanded;
  }, [onLanded]);
  React.useEffect(() => {
    if (!items) return;
    const landed = items.filter((a) => {
      if (a.isActive) {
        active.current.add(a.id);
        return false;
      }
      return active.current.delete(a.id);
    });
    if (!landed.length) return;
    landed.forEach((a) => callback.current(a));
    void invalidateLists(queryClient, projectId);
  }, [items]);
}
