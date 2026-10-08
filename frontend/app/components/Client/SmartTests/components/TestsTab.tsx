import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
  type MenuItem,
} from '@/ui/actions/dropdown-menu';
import { MoreCount } from '@/ui/data/MoreCount';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable, type TableSort } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ActiveFilters } from '@/ui/filters/ActiveFilters';
import { DisplayShell } from '@/ui/filters/DisplayMenu';
import { type FilterDimension, FilterMenu } from '@/ui/filters/FilterMenu';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  ClipboardCheck,
  Footprints,
  Merge,
  MoreHorizontal,
  Play,
  Plus,
  Route,
  Server,
  ShieldAlert,
  Tag as TagIcon,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StartPath } from 'Shared/StartPath/StartPath';

import {
  createTest as apiCreateTest,
  getTest as apiGetTest,
  mergeTests as apiMergeTests,
} from '../api';
import {
  browserTestsKeys,
  invalidateTestData,
  useBulkTests,
  useDeleteTest,
  useEnvironments,
  useProjectId,
  useRunDefaults,
  useSettings,
  useTest,
  useTestCounts,
  useTests,
  useTriggerRun,
  useUpdateTest,
} from '../queries';
import { SyntheticsFrame } from './SyntheticsFrame';
import DraftDrawer from './drawers/DraftDrawer';
import TestDrawer from './drawers/TestDrawer';
import {
  apiTestToVM,
  settableTransition,
  vmToCreateRequest,
  vmToMergeRequest,
  vmToUpdateRequest,
} from './shared/adapters';
import { needsReview } from './shared/revisions';
import {
  ListResponse,
  ListTestsParams,
  RunData,
  Test,
  TestCase,
  TestStatus,
} from './shared/types';
import { kaiUi } from './shared/uiStore';
import { useQueryParam } from './shared/useUrlState';
import {
  LOOKUP_LIMIT,
  RowTags,
  VersionLabel,
  getStatusTag,
  hasNoEnvironment,
  isScheduled,
  scheduleLabel,
  scheduleShort,
} from './shared/utils';
import './tests-page.css';

// The list is server-driven: filters / sort / pagination are query params and the tab
// badges come from /tests/counts, so they stay absolute past one page.
// needs_review is a flag, not a stored status — its tab sends ?needsReview=true.
type StatusTab = 'all' | 'needs_review' | TestStatus;
type FilterKey = 'env' | 'tags';
const PAGE_SIZE = 20;
// column key → API sortField (only these are server-sortable).
const SORT_FIELD: Record<string, ListTestsParams['sortField']> = {
  title: 'name',
  created: 'created_at',
};
const COLUMNS = ['tags', 'env', 'schedule', 'created', 'status'] as const;
const HIDDEN_KEY = '$__tests_columns_hidden__$';
const readHidden = (): string[] => {
  try {
    return localStorage.getItem(HIDDEN_KEY)?.split(',').filter(Boolean) ?? [];
  } catch {
    return [];
  }
};

function NotSet({ children }: { children: string }) {
  return <span className="m-tests__unset">{children}</span>;
}

function TestsTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const updateMut = useUpdateTest();
  const deleteMut = useDeleteTest();
  const bulkMut = useBulkTests();
  const triggerMut = useTriggerRun();
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const defaults = useRunDefaults();
  // Settings → "Pause tests on new revisions": when on, a needs-review test can't run
  // and its run controls are withheld here (the drawer honours the same rule).
  const { data: projectSettings } = useSettings();
  const pauseOnRevision = projectSettings?.pauseOnNewRevisions ?? true;
  const reviewBlocked = (tc: TestCase) => needsReview(tc) && pauseOnRevision;
  const invalidateAll = () => invalidateTestData(queryClient, projectId);

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(''); // debounced query → the actual filter
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<TableSort | null>(null);
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<string[]>(readHidden);
  const [deleteKeys, setDeleteKeys] = useState<string[]>([]);
  // the opened test drawer IS the ?test= param — open iff present. No separate state, so
  // browser back/forward just open/close it (no state↔URL sync loop).
  const [openKey, setOpenKey] = useQueryParam('test');
  const [focusSchedule, setFocusSchedule] = useState(false);
  const [draftTest, setDraftTest] = useState<TestCase | null>(null);
  const creating = draftTest != null;
  // merge-in-review: the base test (first selected) carrying a client-only pendingMerge.
  // Nothing persists until "Combine".
  const [mergeTest, setMergeTest] = useState<TestCase | null>(null);

  // debounce the search box (the setState runs in a timer callback, not synchronously
  // in the effect body)
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  // shared filter set (no pagination/sort) — reused for the list and the aggregates
  const filters = useMemo(
    () => ({
      name: search || undefined,
      environmentId: envFilter !== 'all' ? envFilter : undefined,
      tags: tagFilter !== 'all' ? tagFilter : undefined,
    }),
    [search, envFilter, tagFilter],
  );

  const sortField = sortBy ? SORT_FIELD[sortBy.key] : undefined;
  const listParams: ListTestsParams = {
    page,
    limit: PAGE_SIZE,
    ...filters,
    status:
      statusTab === 'all' || statusTab === 'needs_review'
        ? undefined
        : statusTab,
    ...(statusTab === 'needs_review' ? { needsReview: true } : {}),
    ...(sortField && sortBy
      ? { sortField, sortOrder: sortBy.desc ? 'desc' : 'asc' }
      : {}),
  };

  const { data, isPending } = useTests(listParams);
  const { data: envData } = useEnvironments({ limit: LOOKUP_LIMIT });
  // status buckets ignore the active status tab (so every tab shows its own total);
  // tag buckets drive the tag filter's full option list.
  const { data: statusCounts } = useTestCounts('status', filters);
  const { data: tagCounts } = useTestCounts('tags', {
    ...filters,
    tags: undefined,
    status:
      statusTab === 'all' || statusTab === 'needs_review'
        ? undefined
        : statusTab,
    ...(statusTab === 'needs_review' ? { needsReview: true } : {}),
  });

  // reset to page 1 (and clear the selection) whenever the filter set changes
  const filterKey = `${search}|${statusTab}|${envFilter}|${tagFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
    setSelectedKeys([]);
  }

  const envNameById = useMemo(
    () => new Map((envData?.items ?? []).map((e) => [e.environmentId, e.name])),
    [envData],
  );

  // Rejected tests are dismissed drafts — hidden defensively (our dismiss soft-deletes,
  // so these are rare); the server has no "not rejected" filter.
  const tests = useMemo(
    () =>
      (data?.items ?? [])
        .filter((tc) => tc.status !== 'rejected')
        .map((tc) => apiTestToVM(tc, envNameById)),
    [data, envNameById],
  );
  const total = data?.total ?? 0;

  const countByStatus = (s: string) =>
    statusCounts?.buckets.find((b) => b.value === s)?.count ?? 0;
  const draftCount = countByStatus('draft');
  const approvedCount = countByStatus('approved');
  const activeCount = countByStatus('active');
  const pausedCount = countByStatus('paused');
  // a flagged test counts in needs_review instead of its stored status, so it's a
  // separate addend for the All total
  const needsReviewCount = countByStatus('needs_review');
  const allCount =
    draftCount + approvedCount + activeCount + pausedCount + needsReviewCount;

  const envOptions = (envData?.items ?? []).map((e) => ({
    value: e.environmentId,
    label: e.name,
  }));
  const allTags = (tagCounts?.buckets ?? []).map((b) => b.value);

  // ---- persistence -----------------------------------------------------
  // `status` is written only for a client-settable transition; schedule/unschedule
  // change `cron` only and let the runner promote/demote active.
  const updateTest = (updated: TestCase) => {
    const prev = tests.find((tc) => tc.key === updated.key);
    const status = prev
      ? settableTransition(prev.status, updated.status)
      : undefined;
    updateMut.mutate(
      {
        testId: updated.key,
        body: vmToUpdateRequest(updated, status, !!updated.stepsChanged),
      },
      { onError: () => toast.error(t('Failed to update test')) },
    );
  };
  const removeTest = (key: string) => {
    deleteMut.mutate(key, {
      onError: () => toast.error(t('Failed to delete test')),
    });
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
    if (openKey === key) setOpenKey(null);
  };

  // Patch the cache instead of refetching: a refetch re-runs the query and re-sorts,
  // which moves the row — this keeps it exactly where it was.
  const markSeenLocally = (key: string) => {
    const stamp = new Date().toISOString();
    queryClient.setQueriesData<ListResponse<Test>>(
      {
        queryKey: browserTestsKeys.all(projectId),
        predicate: (q) => q.queryKey[2] === 'tests',
      },
      (old) => {
        if (!old?.items?.some((it) => it.testId === key && !it.seenAt))
          return old;
        return {
          ...old,
          items: old.items.map((it) =>
            it.testId === key && !it.seenAt ? { ...it, seenAt: stamp } : it,
          ),
        };
      },
    );
  };
  const openRow = (tc: TestCase) => {
    setFocusSchedule(false);
    setOpenKey(tc.key, true); // push so Back closes the drawer
    // opening stamps seenAt server-side (GET /tests/{id}); mirror it in the cache
    if (tc.isNew) {
      apiGetTest(projectId, tc.key).catch(() => {});
      markSeenLocally(tc.key);
    }
  };
  const closeDrawer = () => {
    setOpenKey(null);
    setFocusSchedule(false);
  };
  const openSchedule = (tc: TestCase) => {
    setOpenKey(tc.key, true);
    setFocusSchedule(true);
  };
  const unschedule = (tc: TestCase) =>
    updateTest({ ...tc, status: 'approved', schedule: null });

  // A hand-made test skips the draft flow and starts life `approved`.
  const addTest = () => {
    setFocusSchedule(false);
    setDraftTest({
      key: `new-${Date.now()}`,
      title: t('Untitled test'),
      steps: [],
      status: 'approved',
      schedule: null,
      tags: [],
      environments: defaults.envId ? [defaults.envId] : undefined,
      resolutions: defaults.resolution ? [defaults.resolution] : undefined,
      regions: defaults.region ? [defaults.region] : undefined,
    });
    setOpenKey(null);
  };
  const cancelCreate = () => setDraftTest(null);
  const commitCreate = async () => {
    if (!draftTest) return;
    const intended = draftTest;
    setDraftTest(null);
    try {
      // create seeds the status directly — no follow-up PUT
      await apiCreateTest(projectId, vmToCreateRequest(intended));
      toast.success(t('Test created'));
    } catch {
      toast.error(t('Failed to create test'));
      // bring the wizard back with everything entered, for a retry
      setDraftTest(intended);
    }
    invalidateAll();
  };

  // Duplicate: copies the steps only, landing as a new draft.
  const duplicateTest = (tc: TestCase) => {
    apiCreateTest(
      projectId,
      vmToCreateRequest({
        key: '',
        title: `${tc.title} (copy)`,
        steps: [...tc.steps],
        status: 'draft',
      }),
    )
      .then(() => toast.success(t('Duplicated as a draft')))
      .catch(() => toast.error(t('Failed to duplicate test')))
      .finally(invalidateAll);
  };

  const viewRuns = (tc: TestCase) => {
    setOpenKey(null);
    kaiUi.showRunsForTest(tc.title);
  };
  const viewRun = (run: RunData) => {
    setOpenKey(null);
    kaiUi.openRunInRunsTab(run);
  };

  // Normally the open test is on the current page; on a deep link (?test=) it may live
  // on another page or under a filter, so fetch it by id as a fallback.
  const inList = tests.some((tc) => tc.key === openKey);
  const { data: openTestData } = useTest(
    !inList ? (openKey ?? undefined) : undefined,
  );
  const openTest =
    tests.find((tc) => tc.key === openKey) ??
    (openTestData ? apiTestToVM(openTestData, envNameById) : null);

  // ---- bulk actions over the current page's selection ------------------
  // No bulk approve — activating a draft untested is what review is for.
  const selected = tests.filter((tc) => selectedKeys.includes(tc.key));
  const selActive = selected.filter((tc) => tc.status === 'active').length;
  const selPaused = selected.filter(
    (tc) => tc.status === 'paused' && !hasNoEnvironment(tc),
  ).length;

  // one bulk request (and one list refetch), not a PUT + refetch per test
  const bulkSetStatus = (
    predicate: (tc: TestCase) => boolean,
    to: TestCase['status'],
  ) => {
    const targets = selected.filter(predicate);
    setSelectedKeys([]);
    if (!targets.length) return;
    const status = settableTransition(targets[0].status, to);
    if (!status) return;
    bulkMut.mutate(
      {
        testIds: targets.map((tc) => tc.key),
        action: 'update',
        update: { status },
      },
      {
        onSuccess: (res) => {
          if (res?.failed?.length)
            toast.error(
              t('{{n}} tests could not be updated', { n: res.failed.length }),
            );
        },
        onError: () => toast.error(t('Failed to update test')),
      },
    );
  };
  const pauseSelected = () =>
    bulkSetStatus((tc) => tc.status === 'active', 'paused');
  const resumeSelected = () =>
    bulkSetStatus(
      (tc) => tc.status === 'paused' && !hasNoEnvironment(tc),
      'active',
    );
  const deleteMany = (testIds: string[]) => {
    if (testIds.length === 1) return removeTest(testIds[0]);
    setSelectedKeys([]);
    if (openKey && testIds.includes(openKey)) setOpenKey(null);
    bulkMut.mutate(
      { testIds, action: 'delete' },
      { onError: () => toast.error(t('Failed to delete test')) },
    );
  };

  // ---- merge (UI-driven) -----------------------------------------------
  // A merge with a review pending can't start (resolve it first). Base = first selected.
  const mergeBlocked = selected.some((tc) => needsReview(tc));
  const startMerge = async () => {
    const sel = selected;
    if (sel.length < 2) return;
    setSelectedKeys([]);
    setOpenKey(null); // close any open edit drawer so only the merge review shows
    try {
      // pull each test's data so the groups carry full, current steps
      const full = await Promise.all(
        sel.map((tc) => apiGetTest(projectId, tc.key)),
      );
      const vms = full.map((tt) => apiTestToVM(tt, envNameById));
      const [base] = vms;
      setMergeTest({
        ...base,
        pendingMerge: {
          groups: vms.map((v) => ({ title: v.title, steps: [...v.steps] })),
          sourceKeys: vms.map((v) => v.key),
        },
      });
    } catch {
      toast.error(t('Failed to load tests to merge'));
    }
  };
  const commitMerge = async (steps: string[]) => {
    const base = mergeTest;
    if (!base?.pendingMerge) return;
    const { sourceKeys } = base.pendingMerge;
    setMergeTest(null);
    try {
      // one atomic call: creates the merged test + soft-deletes the sources
      await apiMergeTests(projectId, vmToMergeRequest(base, sourceKeys, steps));
      toast.success(t('Merged {{n}} tests', { n: sourceKeys.length }));
    } catch {
      toast.error(t('Failed to merge tests'));
      // reopen the merge review as it was, for a retry
      setMergeTest(base);
    }
    invalidateAll();
  };

  // Escape hatch for a test stuck "needs review" with no suggestion to activate/dismiss.
  const clearReview = (tc: TestCase) =>
    updateMut.mutate(
      { testId: tc.key, body: { needsReview: false } },
      { onError: () => toast.error(t('Failed to update test')) },
    );

  const runNow = (tc: TestCase) => {
    if (reviewBlocked(tc)) return;
    triggerMut.mutate(tc.key, {
      onSuccess: () =>
        toast.success(`${tc.title} — ${t('run started, see Runs')}`),
      onError: () => toast.error(t('Failed to start run')),
    });
  };

  const mergeWith = (tc: TestCase) => {
    setSelectedKeys((prev) =>
      prev.includes(tc.key) ? prev : [...prev, tc.key],
    );
    toast.info(
      t('Select the tests to merge with, then hit Merge in the toolbar.'),
    );
  };

  // A draft is the agent's suggestion (dismissed), anything else is someone's work
  // (deleted) — a row never offers both.
  const rowMenu = (tc: TestCase): MenuItem[] => {
    const open = { key: 'open', onClick: () => openRow(tc) };
    const del: MenuItem = {
      key: 'delete',
      label: t('Delete'),
      danger: true,
      onClick: () => setDeleteKeys([tc.key]),
    };
    if (tc.status === 'draft')
      return [
        { ...open, label: t('Review draft') },
        { key: 'merge', label: t('Merge with…'), onClick: () => mergeWith(tc) },
        { key: 'd1', type: 'divider' },
        {
          key: 'dismiss',
          label: t('Dismiss'),
          danger: true,
          onClick: () => {
            // announce it — a row that vanishes silently reads as lost
            removeTest(tc.key);
            toast.success(t('Draft dismissed'));
          },
        },
      ];
    const controls: MenuItem[] = [];
    // a needs-review test (with pause-on-revision) is frozen until reviewed
    if (!reviewBlocked(tc)) {
      if (tc.status === 'active')
        controls.push({
          key: 'pause',
          label: t('Pause'),
          onClick: () => updateTest({ ...tc, status: 'paused' }),
        });
      if (tc.status === 'paused') {
        const blocked = hasNoEnvironment(tc);
        controls.push({
          key: 'resume',
          disabled: blocked,
          label: blocked ? (
            <Tooltip
              title={t('Set an environment in this test’s settings to resume.')}
              side="left"
            >
              <span>{t('Resume')}</span>
            </Tooltip>
          ) : (
            t('Resume')
          ),
          onClick: () => updateTest({ ...tc, status: 'active' }),
        });
      }
      // gate on the actual schedule, not status: an already-scheduled test (active,
      // paused, or approved-with-cron) can only be unscheduled
      controls.push(
        isScheduled(tc.schedule)
          ? {
              key: 'unschedule',
              label: t('Unschedule'),
              onClick: () => unschedule(tc),
            }
          : {
              key: 'schedule',
              label: t('Schedule'),
              onClick: () => openSchedule(tc),
            },
      );
    }
    return [
      ...controls,
      {
        ...open,
        label: needsReview(tc) ? t('Review changes') : t('Settings'),
      },
      // stuck "needs review" with no suggestion to act on → clear the flag directly
      ...(tc.needsReview && !tc.pendingRevision
        ? [
            {
              key: 'markReviewed',
              label: t('Mark as reviewed'),
              onClick: () => clearReview(tc),
            },
          ]
        : []),
      {
        key: 'duplicate',
        label: t('Duplicate'),
        onClick: () => duplicateTest(tc),
      },
      { key: 'merge', label: t('Merge with…'), onClick: () => mergeWith(tc) },
      { key: 'd1', type: 'divider' },
      del,
    ];
  };

  const columns: (Column<TestCase> & { key: string })[] = [
    {
      title: t('Test'),
      key: 'title',
      sortable: true,
      render: (tc) => {
        // a pending revision (or an unopened new draft) waits for the user
        const dot = needsReview(tc)
          ? t('New version — not reviewed yet')
          : tc.status === 'draft' && tc.isNew
            ? t('New — not reviewed yet')
            : null;
        return (
          <div className="m-tests__title-cell">
            {dot ? (
              <Tooltip title={dot}>
                <span className="m-dot is-slot" role="img" aria-label={dot} />
              </Tooltip>
            ) : (
              <span className="m-dot is-slot is-off" aria-hidden="true" />
            )}
            <span className="m-tests__title m-truncate">{tc.title}</span>
            <VersionLabel version={tc.version} />
            {tc.hasSideEffects && (
              <Tooltip
                title={t(
                  'Has side effects. Running this test changes real data: orders, accounts, payments.',
                )}
              >
                <span
                  className="m-tests__fx"
                  aria-label={t('Has side effects')}
                >
                  <ShieldAlert size={13} aria-hidden="true" />
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: t('Tags'),
      key: 'tags',
      width: 184,
      render: (tc) => <RowTags tags={tc.tags} />,
    },
    {
      title: t('Environment'),
      key: 'env',
      width: 148,
      render: (tc) => {
        const envs = tc.envNames ?? [];
        if (envs.length === 0) return <NotSet>{t('Not set')}</NotSet>;
        return (
          <div className="m-tests__chips">
            <span className="m-tests__env m-truncate">{envs[0]}</span>
            <MoreCount hidden={envs.slice(1)} />
          </div>
        );
      },
    },
    {
      title: t('Schedule'),
      key: 'schedule',
      width: 168,
      render: (tc) =>
        !isScheduled(tc.schedule) ? (
          <NotSet>{t('Not scheduled')}</NotSet>
        ) : (
          <Tooltip title={scheduleLabel(t, tc.schedule)}>
            <span className="m-tests__sched">
              <Calendar size={12} aria-hidden="true" />
              <span className="m-truncate">
                {scheduleShort(t, tc.schedule)}
              </span>
            </span>
          </Tooltip>
        ),
    },
    {
      title: t('Created'),
      key: 'created',
      width: 104,
      sortable: true,
      render: (tc) =>
        tc.createdAt ? <RelativeTime at={tc.createdAt} /> : <NotSet>—</NotSet>,
    },
    {
      title: t('Status'),
      key: 'status',
      width: 124,
      render: (tc) =>
        getStatusTag(reviewBlocked(tc) ? 'needs_review' : tc.status, t),
    },
    {
      title: '',
      key: 'actions',
      width: 76,
      align: 'right',
      render: (tc) => (
        <div className="m-tests__actions">
          {/* a draft is a proposal: nothing to run yet */}
          {tc.status !== 'draft' && (
            <Tooltip
              title={
                reviewBlocked(tc)
                  ? t('Runs are paused until the new version is reviewed.')
                  : undefined
              }
            >
              <span>
                <IconButton
                  icon={<Play size={14} />}
                  label={t('Run now')}
                  variant="ghost"
                  disabled={reviewBlocked(tc)}
                  onClick={() => runNow(tc)}
                />
              </span>
            </Tooltip>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span>
                <IconButton
                  icon={<MoreHorizontal size={15} />}
                  label={t('Actions for {{name}}', { name: tc.title })}
                  variant="ghost"
                />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItems items={rowMenu(tc)} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
  const visible = columns.filter(
    (c) => !hidden.includes(c.key as (typeof COLUMNS)[number]),
  );

  const columnLabel: Record<(typeof COLUMNS)[number], string> = {
    tags: t('Tags'),
    env: t('Environment'),
    schedule: t('Schedule'),
    created: t('Created'),
    status: t('Status'),
  };
  const saveHidden = (next: string[]) => {
    setHidden(next);
    try {
      if (next.length) localStorage.setItem(HIDDEN_KEY, next.join(','));
      else localStorage.removeItem(HIDDEN_KEY);
    } catch {}
  };

  /* ── filters ── */
  const dimensions: FilterDimension<FilterKey>[] = [
    {
      key: 'env',
      label: t('Environment'),
      icon: <Server size={14} />,
      single: true,
      options: envOptions,
    },
    {
      key: 'tags',
      label: t('Tags'),
      icon: <TagIcon size={14} />,
      single: true,
      options: allTags.map((tag) => ({ value: tag, label: tag })),
    },
  ];
  const isActive = (key: FilterKey, value: string) =>
    key === 'env' ? envFilter === value : tagFilter === value;
  const onToggle = (key: FilterKey, value: string) => {
    const set = key === 'env' ? setEnvFilter : setTagFilter;
    set((prev) => (prev === value ? 'all' : value));
  };
  const chips = [
    ...(envFilter !== 'all'
      ? [
          {
            key: 'env' as const,
            value: envFilter,
            dimension: t('Environment'),
            label: envNameById.get(envFilter) ?? envFilter,
          },
        ]
      : []),
    ...(tagFilter !== 'all'
      ? [
          {
            key: 'tags' as const,
            value: tagFilter,
            dimension: t('Tag'),
            label: tagFilter,
          },
        ]
      : []),
  ];
  const clearFilters = () => {
    setEnvFilter('all');
    setTagFilter('all');
    setQuery('');
  };

  const statusItems = [
    { key: 'all', label: t('All'), count: allCount },
    // only when something awaits review — no point in an always-empty tab
    ...(needsReviewCount > 0
      ? [
          {
            key: 'needs_review',
            label: t('Needs review'),
            count: needsReviewCount,
          },
        ]
      : []),
    { key: 'draft', label: t('Drafts'), count: draftCount },
    { key: 'approved', label: t('Approved'), count: approvedCount },
    { key: 'active', label: t('Active'), count: activeCount },
    { key: 'paused', label: t('Paused'), count: pausedCount },
  ];

  const filtered =
    statusTab !== 'all' ||
    !!search ||
    envFilter !== 'all' ||
    tagFilter !== 'all';
  // first-run empty state — only when there are genuinely no tests, not when a filter
  // simply matched nothing
  const firstRun = (
    <EmptyState
      art="tests"
      title={t('Watching your sessions')}
      hint={t(
        'The agent learns the journeys real users take and drafts a test for each one it has seen enough times. You review, it runs.',
      )}
      action={
        <Button onClick={addTest}>
          <Plus size={14} />
          {t('Add a test by hand')}
        </Button>
      }
    >
      <StartPath
        steps={[
          {
            icon: <Route />,
            label: t('Users take a journey'),
            hint: t('Sign-up, checkout, search'),
          },
          {
            icon: <Footprints />,
            label: t('The agent learns a journey'),
            hint: t('After enough sessions'),
          },
          {
            icon: <ClipboardCheck />,
            label: t('Review the draft'),
            hint: t('Approve, then it runs'),
          },
        ]}
      />
    </EmptyState>
  );
  const emptyTab: Record<StatusTab, string> = {
    all: t('No tests yet'),
    draft: t('No drafts waiting'),
    needs_review: t('Nothing to review'),
    approved: t('Nothing approved and idle'),
    active: t('No tests are running'),
    paused: t('Nothing is paused'),
    rejected: t('No tests yet'),
  };
  const empty =
    search || envFilter !== 'all' || tagFilter !== 'all' ? (
      <EmptyState
        art="search"
        title={t('No tests match these filters')}
        hint={t('Clear them to see the whole list again.')}
        action={<Button onClick={clearFilters}>{t('Clear filters')}</Button>}
      />
    ) : (
      <EmptyState
        title={emptyTab[statusTab]}
        hint={t('Pick another tab to see the rest of the list.')}
      />
    );

  const deleteTargets = tests.filter((tc) => deleteKeys.includes(tc.key));
  const deleteOne = deleteKeys.length === 1 ? deleteTargets[0] : undefined;

  return (
    <SyntheticsFrame
      actions={
        <>
          <SearchField
            placeholder={t('Search tests')}
            value={query}
            onChange={setQuery}
          />
          <Button variant="primary" onClick={addTest}>
            <Plus size={14} />
            {t('Add test')}
          </Button>
        </>
      }
      toolbar={
        <>
          <FilterStrip
            label={t('Filter by status')}
            items={statusItems}
            selected={[statusTab]}
            onSelect={(key) => setStatusTab(key as StatusTab)}
          />
          {/* a selection swaps the controls for what applies to it, each with its count */}
          <div className="m-page__controls">
            {selectedKeys.length > 0 ? (
              <>
                <span className="m-tests__selcount">
                  {t('{{n}} selected', { n: selectedKeys.length })}
                </span>
                {selActive > 0 && (
                  <Button onClick={pauseSelected}>
                    {t('Pause')} ({selActive})
                  </Button>
                )}
                {selPaused > 0 && (
                  <Button onClick={resumeSelected}>
                    {t('Resume')} ({selPaused})
                  </Button>
                )}
                {selectedKeys.length >= 2 && (
                  <Tooltip
                    title={
                      mergeBlocked
                        ? t(
                            'A selected test has a review pending — resolve it first.',
                          )
                        : undefined
                    }
                  >
                    <span>
                      <Button
                        disabled={mergeBlocked}
                        onClick={() => void startMerge()}
                      >
                        <Merge size={13} />
                        {t('Merge')} ({selectedKeys.length})
                      </Button>
                    </span>
                  </Tooltip>
                )}
                <Button
                  variant="danger-outline"
                  onClick={() => setDeleteKeys(selectedKeys)}
                >
                  {t('Delete')} ({selectedKeys.length})
                </Button>
                <Button variant="subtle" onClick={() => setSelectedKeys([])}>
                  {t('Clear')}
                </Button>
              </>
            ) : (
              <>
                <FilterMenu<FilterKey>
                  dimensions={dimensions}
                  isActive={isActive}
                  onToggle={onToggle}
                  activeCount={chips.length}
                  label={t('Filter tests')}
                />
                <DisplayShell
                  label={t('Display tests')}
                  changeCount={hidden.length ? 1 : 0}
                  onReset={() => saveHidden([])}
                  rows={[]}
                  fields={COLUMNS.map((k) => ({
                    value: k,
                    label: columnLabel[k],
                    on: !hidden.includes(k),
                  }))}
                  onToggleField={(k) =>
                    saveHidden(
                      hidden.includes(k)
                        ? hidden.filter((h) => h !== k)
                        : [...hidden, k],
                    )
                  }
                />
              </>
            )}
          </div>
        </>
      }
    >
      <ActiveFilters<FilterKey>
        chips={chips}
        onRemove={onToggle}
        onClearAll={() => {
          setEnvFilter('all');
          setTagFilter('all');
        }}
        resultCount={total}
        noun={[t('test'), t('tests')]}
      />
      {isPending ? (
        <SkeletonRows rows={7} columns={[34, 16, 12, 14, 8, 10]} />
      ) : total === 0 && !filtered ? (
        firstRun
      ) : tests.length === 0 ? (
        empty
      ) : (
        <>
          <DataTable<TestCase>
            className="m-tests__table"
            ariaLabel={t('Tests')}
            columns={visible}
            rows={tests}
            rowKey={(tc) => tc.key}
            rowClassName={(tc) =>
              tc.status === 'draft' && tc.isNew
                ? 'm-tests__row is-new'
                : 'm-tests__row'
            }
            sort={sortBy}
            onSort={(key, desc) => {
              setSortBy(key ? { key, desc } : null);
              setPage(1);
            }}
            selection={{
              selected: selectedKeys,
              onChange: setSelectedKeys,
              label: (tc) => t('Select {{name}}', { name: tc.title }),
            }}
            onRowClick={(tc) => openRow(tc)}
          />
          <ListFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            noun={[t('test'), t('tests')]}
            onPage={(p) => {
              // selection is per page: the bulk verbs act on the rows in view
              setSelectedKeys([]);
              setPage(p);
            }}
          />
        </>
      )}

      {/* keyed by the RESOLVED test, not by ?test= — a deep-linked test arrives after
          the drawer would otherwise have mounted with nothing in it */}
      <DraftDrawer
        key={`draft-${openTest?.key ?? 'none'}`}
        test={openTest?.status === 'draft' ? openTest : null}
        open={openTest?.status === 'draft'}
        defaults={defaults}
        onClose={closeDrawer}
        onChange={updateTest}
        onRemove={removeTest}
      />
      <TestDrawer
        key={
          creating
            ? `test-new-${draftTest?.key}`
            : `test-${openTest?.key ?? 'none'}`
        }
        test={
          creating
            ? draftTest
            : openTest && openTest.status !== 'draft'
              ? openTest
              : null
        }
        open={creating || (!!openTest && openTest.status !== 'draft')}
        creating={creating}
        focusSchedule={focusSchedule}
        onCreate={commitCreate}
        onViewRuns={viewRuns}
        onViewRun={viewRun}
        onClose={() => {
          if (creating) {
            cancelCreate();
            return;
          }
          closeDrawer();
        }}
        onChange={creating ? setDraftTest : updateTest}
        onRemove={removeTest}
      />
      {/* merge review — a client-only base test carrying pendingMerge; edits stay local
          until "Combine", which creates one test + deletes the sources */}
      <TestDrawer
        key={mergeTest ? `merge-${mergeTest.key}` : 'merge-none'}
        test={mergeTest}
        open={!!mergeTest}
        onClose={() => setMergeTest(null)}
        onChange={setMergeTest}
        onRemove={() => setMergeTest(null)}
        onMergeAccept={commitMerge}
        onCancelMerge={() => setMergeTest(null)}
      />
      <ConfirmDialog
        open={deleteKeys.length > 0}
        title={
          deleteOne
            ? t('Delete this test?')
            : t('Delete {{n}} tests?', { n: deleteKeys.length })
        }
        okText={t('Delete')}
        danger
        onCancel={() => setDeleteKeys([])}
        onOk={() => {
          deleteMany(deleteKeys);
          setDeleteKeys([]);
        }}
      >
        {deleteOne
          ? t('“{{title}}” and its run history will be removed.', {
              title: deleteOne.title,
            })
          : t('The selected tests and their run history will be removed.')}
      </ConfirmDialog>
    </SyntheticsFrame>
  );
}

export default TestsTab;
