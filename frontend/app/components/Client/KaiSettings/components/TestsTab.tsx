import { useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Dropdown,
  Input,
  Segmented,
  Select,
  Skeleton,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  Calendar,
  EllipsisVertical,
  Merge,
  Play,
  Plus,
  Radar,
  ShieldAlert,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import CountSuffix from 'Shared/CountSuffix';
import FullPagination from 'Shared/FullPagination';

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
import DraftDrawer from './drawers/DraftDrawer';
import TestDrawer from './drawers/TestDrawer';
import './kai-table.css';
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
  relativeTime,
  scheduleLabel,
  scheduleShort,
} from './shared/utils';

// The list is server-driven: filters / sort / pagination are query params and the tab
// badges come from /tests/counts, so they stay absolute past one page.
// needs_review is a flag, not a stored status — its tab sends ?needsReview=true.
type StatusTab = 'all' | 'needs_review' | TestStatus;
const PAGE_SIZE = 20;
// antd column dataIndex → API sortField (only these are server-sortable).
const SORT_FIELD: Record<string, ListTestsParams['sortField']> = {
  title: 'name',
  createdAt: 'created_at',
};

function TestsTab() {
  const { t } = useTranslation();
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
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [sortBy, setSortBy] = useState<{
    field?: string;
    order?: 'ascend' | 'descend';
  }>({});
  const [page, setPage] = useState(1);
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

  const sortField = sortBy.field ? SORT_FIELD[sortBy.field] : undefined;
  const listParams: ListTestsParams = {
    page,
    limit: PAGE_SIZE,
    ...filters,
    status:
      statusTab === 'all' || statusTab === 'needs_review'
        ? undefined
        : statusTab,
    ...(statusTab === 'needs_review' ? { needsReview: true } : {}),
    ...(sortField && sortBy.order
      ? { sortField, sortOrder: sortBy.order === 'ascend' ? 'asc' : 'desc' }
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

  const bulkUpdate = (
    predicate: (tc: TestCase) => boolean,
    patch: (tc: TestCase) => Partial<TestCase>,
  ) => {
    const targets = selected.filter(predicate);
    setSelectedKeys([]);
    targets.forEach((tc) => updateTest({ ...tc, ...patch(tc) }));
  };
  const pauseSelected = () =>
    bulkUpdate(
      (tc) => tc.status === 'active',
      () => ({ status: 'paused' }),
    );
  const resumeSelected = () =>
    bulkUpdate(
      (tc) => tc.status === 'paused' && !hasNoEnvironment(tc),
      () => ({ status: 'active' }),
    );
  const deleteSelected = () => {
    const testIds = selectedKeys.map(String);
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

  const faded = (n: number) => <CountSuffix n={n} />;
  const statusOptions = [
    {
      value: 'all',
      label: (
        <span>
          {t('All')}
          {faded(allCount)}
        </span>
      ),
    },
    // only when something awaits review — no point in an always-empty tab
    ...(needsReviewCount > 0
      ? [
          {
            value: 'needs_review',
            label: (
              <span>
                {t('Needs review')}
                {faded(needsReviewCount)}
              </span>
            ),
          },
        ]
      : []),
    {
      value: 'draft',
      label: (
        <span>
          {t('Drafts')}
          {faded(draftCount)}
        </span>
      ),
    },
    {
      value: 'approved',
      label: (
        <span>
          {t('Approved')}
          {faded(approvedCount)}
        </span>
      ),
    },
    {
      value: 'active',
      label: (
        <span>
          {t('Active')}
          {faded(activeCount)}
        </span>
      ),
    },
    {
      value: 'paused',
      label: (
        <span>
          {t('Paused')}
          {faded(pausedCount)}
        </span>
      ),
    },
  ];

  const rowMenu = (tc: TestCase) => {
    let items;
    if (tc.status === 'draft') {
      items = [
        { key: 'open', label: t('Review draft') },
        { key: 'merge', label: t('Merge with…') },
        { type: 'divider' as const },
        { key: 'dismiss', label: t('Dismiss'), danger: true },
      ];
    } else {
      const controls: {
        key: string;
        label: React.ReactNode;
        disabled?: boolean;
      }[] = [];
      // a needs-review test (with pause-on-revision) is frozen until reviewed
      if (!reviewBlocked(tc)) {
        if (tc.status === 'active')
          controls.push({ key: 'pause', label: t('Pause') });
        if (tc.status === 'paused') {
          const blocked = hasNoEnvironment(tc);
          controls.push({
            key: 'resume',
            disabled: blocked,
            label: blocked ? (
              <Tooltip
                title={t(
                  'Set an environment in this test’s settings to resume.',
                )}
                placement="left"
              >
                <span>{t('Resume')}</span>
              </Tooltip>
            ) : (
              t('Resume')
            ),
          });
        }
        // gate on the actual schedule, not status: an already-scheduled test (active,
        // paused, or approved-with-cron) can only be unscheduled
        if (!isScheduled(tc.schedule))
          controls.push({ key: 'schedule', label: t('Schedule') });
        else controls.push({ key: 'unschedule', label: t('Unschedule') });
      }
      items = [
        ...controls,
        {
          key: 'open',
          label: needsReview(tc) ? t('Review changes') : t('Settings'),
        },
        // stuck "needs review" with no suggestion to act on → clear the flag directly
        ...(tc.needsReview && !tc.pendingRevision
          ? [{ key: 'markReviewed', label: t('Mark as reviewed') }]
          : []),
        { key: 'duplicate', label: t('Duplicate') },
        { key: 'merge', label: t('Merge with…') },
        { type: 'divider' as const },
        { key: 'delete', label: t('Delete'), danger: true },
      ];
    }
    return {
      items,
      onClick: ({
        key,
        domEvent,
      }: {
        key: string;
        domEvent: React.SyntheticEvent;
      }) => {
        domEvent.stopPropagation();
        if (key === 'open') openRow(tc);
        else if (key === 'schedule') openSchedule(tc);
        else if (key === 'unschedule') unschedule(tc);
        else if (key === 'duplicate') duplicateTest(tc);
        else if (key === 'merge') {
          setSelectedKeys((prev) =>
            prev.includes(tc.key) ? prev : [...prev, tc.key],
          );
          toast.info(
            t('Select the tests to merge with, then hit Merge in the toolbar.'),
          );
        } else if (key === 'pause') updateTest({ ...tc, status: 'paused' });
        else if (key === 'resume') updateTest({ ...tc, status: 'active' });
        else if (key === 'markReviewed') clearReview(tc);
        else if (key === 'dismiss') {
          // announce it — a row that vanishes silently reads as lost
          removeTest(tc.key);
          toast.success(t('Draft dismissed'));
        } else if (key === 'delete') removeTest(tc.key);
      },
    };
  };

  const columns: TableColumnsType<TestCase> = [
    {
      title: t('Test'),
      dataIndex: 'title',
      sorter: true,
      showSorterTooltip: false,
      render: (title: string, tc) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{title}</span>
          <VersionLabel version={tc.version} />
          {tc.hasSideEffects && (
            <Tooltip
              title={t(
                'Has side effects. Running this test affects real data (orders / accounts / payments).',
              )}
            >
              <span className="shrink-0 flex items-center text-warning-text">
                <ShieldAlert size={14} />
              </span>
            </Tooltip>
          )}
          {/* a pending revision (or an unopened new draft) waits for the user */}
          {(needsReview(tc) || (tc.status === 'draft' && tc.isNew)) && (
            <Tooltip
              title={
                needsReview(tc)
                  ? t('New version — not reviewed yet')
                  : t('New — not reviewed yet')
              }
            >
              <span className="shrink-0 flex items-center">
                <Badge color="var(--color-main)" />
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: t('Tags'),
      dataIndex: 'tags',
      width: 190,
      render: (tags: string[]) => <RowTags tags={tags} />,
    },
    {
      title: t('Environment'),
      dataIndex: 'envNames',
      width: 150,
      showSorterTooltip: false,
      render: (envNames?: string[]) => {
        if (!envNames || envNames.length === 0)
          return (
            <span className="text-disabled-text italic">{t('Not set')}</span>
          );
        const [first, ...rest] = envNames;
        return (
          <Tooltip title={envNames.join(', ')}>
            <span className="text-gray-dark">
              {first}
              {rest.length > 0 && (
                <span className="text-gray-medium"> +{rest.length}</span>
              )}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: t('Schedule'),
      dataIndex: 'schedule',
      width: 180,
      showSorterTooltip: false,
      render: (_: unknown, tc) =>
        !isScheduled(tc.schedule) ? (
          <span className="text-disabled-text italic">
            {t('Not scheduled')}
          </span>
        ) : (
          <Tooltip title={scheduleLabel(t, tc.schedule)}>
            <span className="flex items-center gap-1.5 text-gray-dark">
              <Calendar size={13} className="shrink-0 text-gray-medium" />
              <span className="truncate">{scheduleShort(t, tc.schedule)}</span>
            </span>
          </Tooltip>
        ),
    },
    {
      title: t('Created'),
      dataIndex: 'createdAt',
      width: 120,
      sorter: true, // server-sorted via created_at (see SORT_FIELD)
      showSorterTooltip: false,
      render: (ts?: number) =>
        ts ? (
          <Tooltip
            title={new Date(ts).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          >
            <span className="text-disabled-text">{relativeTime(t, ts)}</span>
          </Tooltip>
        ) : (
          <span className="text-disabled-text">—</span>
        ),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      width: 120,
      showSorterTooltip: false,
      render: (_: unknown, tc) =>
        getStatusTag(reviewBlocked(tc) ? 'needs_review' : tc.status, t),
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 104,
      align: 'right',
      render: (_: unknown, tc) => (
        <div className="flex items-center justify-end">
          {tc.status !== 'draft' && (
            <Tooltip
              title={
                reviewBlocked(tc)
                  ? t('Runs are paused until the new version is reviewed.')
                  : t('Run now')
              }
            >
              <Button
                type="text"
                icon={<Play size={16} />}
                aria-label={t('Run now')}
                disabled={reviewBlocked(tc)}
                onClick={(e) => {
                  e.stopPropagation();
                  runNow(tc);
                }}
              />
            </Tooltip>
          )}
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={rowMenu(tc)}
          >
            <Button
              type="text"
              icon={<EllipsisVertical size={16} />}
              aria-label={t('Actions')}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      ),
    },
  ];

  if (isPending) {
    return (
      <div className="p-4">
        <Skeleton active paragraph={{ rows: 5 }} />
      </div>
    );
  }

  // first-run empty state — only when there are genuinely no tests, not when a filter
  // simply matched nothing
  const noTests =
    total === 0 &&
    statusTab === 'all' &&
    !search &&
    envFilter === 'all' &&
    tagFilter === 'all';
  if (noTests && !creating) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-16 px-4">
        <div className="w-12 h-12 rounded-full bg-gray-lightest flex items-center justify-center">
          <Radar size={22} className="text-gray-medium" />
        </div>
        <Typography.Text strong className="text-base!">
          {t('Watching your sessions')}
        </Typography.Text>
        <Typography.Text type="secondary" className="max-w-md">
          {t(
            'As real users move through your app, the agent learns the journeys they take. Once it has seen a full journey across enough sessions, it drafts a test here for you to review.',
          )}
        </Typography.Text>
        <span className="text-sm text-disabled-text">
          {t('Nothing to set up — drafts will appear as they are ready.')}
        </span>
        <Button
          type="primary"
          icon={<Plus size={14} />}
          onClick={addTest}
          className="mt-1"
        >
          {t('Add test manually')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* controls bar — status tabs (left) + search & filters (right) */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-wrap">
        <Segmented
          size="small"
          value={statusTab}
          onChange={(v) => setStatusTab(v as StatusTab)}
          options={statusOptions}
        />
        {selectedKeys.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-disabled-text">
              {selectedKeys.length} {t('selected')}
            </span>
            {selActive > 0 && (
              <Button size="small" onClick={pauseSelected}>
                {t('Pause')} ({selActive})
              </Button>
            )}
            {selPaused > 0 && (
              <Button size="small" onClick={resumeSelected}>
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
                <Button
                  size="small"
                  disabled={mergeBlocked}
                  icon={<Merge size={13} />}
                  onClick={startMerge}
                >
                  {t('Merge')} ({selectedKeys.length})
                </Button>
              </Tooltip>
            )}
            <Button size="small" danger onClick={deleteSelected}>
              {t('Delete')} ({selectedKeys.length})
            </Button>
            <Button
              size="small"
              type="text"
              onClick={() => setSelectedKeys([])}
            >
              {t('Clear')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Input.Search
              size="small"
              allowClear
              placeholder={t('Search tests')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: 170 }}
            />
            <Select
              size="small"
              value={envFilter}
              onChange={setEnvFilter}
              style={{ width: 150 }}
              options={[
                { value: 'all', label: t('All environments') },
                ...envOptions,
              ]}
            />
            <Select
              size="small"
              value={tagFilter}
              onChange={setTagFilter}
              style={{ width: 130 }}
              options={[
                { value: 'all', label: t('All tags') },
                ...allTags.map((tag) => ({ value: tag, label: tag })),
              ]}
            />
            <Button
              size="small"
              type="primary"
              icon={<Plus size={14} />}
              onClick={addTest}
            >
              {t('Add test')}
            </Button>
          </div>
        )}
      </div>

      <Table<TestCase>
        className="kai-table"
        rowKey="key"
        columns={columns}
        dataSource={tests}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: setSelectedKeys,
          columnWidth: 44,
        }}
        rowClassName={(tc) =>
          `cursor-pointer${tc.status === 'draft' && tc.isNew ? ' kai-row-new' : ''}`
        }
        onChange={(_p, _f, sorter) => {
          const s = Array.isArray(sorter) ? sorter[0] : sorter;
          setSortBy({ field: s.field as string, order: s.order ?? undefined });
          setPage(1);
        }}
        onRow={(tc) => ({
          onClick: (e) => {
            const el = e.target as HTMLElement;
            if (
              el.closest('button') ||
              el.closest('.ant-checkbox-wrapper') ||
              el.closest('.ant-table-selection-column') ||
              el.closest('.ant-dropdown')
            )
              return;
            openRow(tc);
          },
        })}
        locale={{ emptyText: t('No tests match these filters.') }}
      />

      {total > 0 && (
        <FullPagination
          page={page}
          limit={PAGE_SIZE}
          total={total}
          listLen={tests.length}
          onPageChange={setPage}
          entity="tests"
        />
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
    </div>
  );
}

export default TestsTab;
