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
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { Calendar, EllipsisVertical, Play, Plus, Radar } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import FullPagination from 'Shared/FullPagination';

import { createTest as apiCreateTest, getTest as apiGetTest } from '../api';
import {
  browserTestsKeys,
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
import { needsReview } from './shared/revisions';
import {
  apiTestToVM,
  settableTransition,
  vmToCreateRequest,
  vmToUpdateRequest,
} from './shared/adapters';
import { ListTestsParams, RunData, TestCase, TestStatus } from './shared/types';
import { kaiUi } from './shared/uiStore';
import { useUrlState } from './shared/useUrlState';
import {
  PERIOD_OPTIONS,
  RowTags,
  VersionLabel,
  getStatusTag,
  hasNoEnvironment,
  isScheduled,
  periodFrom,
  scheduleLabel,
  scheduleShort,
} from './shared/utils';

// The list is now server-driven: filters / sort / pagination are query params, and the
// tab badges come from the /tests/counts aggregate — so they stay absolute even past one
// page. Only the columns the API can sort (Test → name) are sortable.
// needs_review is a flag, not a stored status — its tab sends ?needsReview=true.
type StatusTab = 'all' | 'needs_review' | TestStatus;
const PAGE_SIZE = 20;
// antd column dataIndex → API sortField (only these are server-sortable).
const SORT_FIELD: Record<string, ListTestsParams['sortField']> = {
  title: 'name',
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
  // Settings → "Pause tests on new revisions": when on, a needs-review test can't run and
  // its run controls are withheld here (the drawer honours the same rule).
  const { data: projectSettings } = useSettings();
  const pauseOnRevision = projectSettings?.pauseOnNewRevisions ?? true;
  const reviewBlocked = (tc: TestCase) => needsReview(tc) && pauseOnRevision;
  const invalidateAll = () =>
    queryClient.invalidateQueries({
      queryKey: browserTestsKeys.all(projectId),
    });

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState(''); // debounced query → the actual filter
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [sortBy, setSortBy] = useState<{
    field?: string;
    order?: 'ascend' | 'descend';
  }>({});
  const [page, setPage] = useState(1);
  // opened test persists in the URL (?test=) — seed from it on first render
  const { get, set } = useUrlState();
  const [openKey, setOpenKey] = useState<string | null>(() => get('test') ?? null);
  const [focusSchedule, setFocusSchedule] = useState(false);
  const [draftTest, setDraftTest] = useState<TestCase | null>(null);
  const creating = draftTest != null;

  // debounce the search box so typing isn't one request per keystroke (the setState
  // runs in a timer callback, not synchronously in the effect body)
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  // keep ?test= in sync with the open drawer (removed when nothing is open)
  useEffect(() => {
    set('test', openKey ?? undefined);
  }, [openKey, set]);

  // shared filter set (no pagination/sort) — reused for the list and the count aggregates
  const filters = useMemo(
    () => ({
      name: search || undefined,
      environmentId: envFilter !== 'all' ? envFilter : undefined,
      tags: tagFilter !== 'all' ? tagFilter : undefined,
      from: periodFrom(periodFilter),
    }),
    [search, envFilter, tagFilter, periodFilter],
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
  const { data: envData } = useEnvironments({ limit: 100 });
  // status buckets ignore the active status tab (so every tab shows its own total);
  // tag buckets drive the tag filter's full option list.
  const { data: statusCounts } = useTestCounts('status', filters);
  const { data: tagCounts } = useTestCounts('tags', {
    ...filters,
    tags: undefined,
    status: statusTab !== 'all' ? statusTab : undefined,
  });

  // reset to page 1 (and clear the selection) whenever the filter set changes
  const filterKey = `${search}|${statusTab}|${envFilter}|${tagFilter}|${periodFilter}`;
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

  // Rejected tests are dismissed drafts — defensively hidden (our dismiss soft-deletes,
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
  // needs_review is an effective-status bucket — a flagged test counts here instead of its
  // stored status, so it's a separate addend for the All total.
  const needsReviewCount = countByStatus('needs_review');
  const allCount =
    draftCount + approvedCount + activeCount + pausedCount + needsReviewCount;

  const envOptions = (envData?.items ?? []).map((e) => ({
    value: e.environmentId,
    label: e.name,
  }));
  const allTags = (tagCounts?.buckets ?? []).map((b) => b.value);

  // ---- persistence -----------------------------------------------------
  // Persist an edited test. `status` is written only for a client-settable transition
  // (draft→approved, active⇄paused); schedule/unschedule change `cron` only and let the
  // runner promote/demote active (see `settableTransition`).
  const updateTest = (updated: TestCase) => {
    const prev = tests.find((tc) => tc.key === updated.key);
    const status = prev
      ? settableTransition(prev.status, updated.status)
      : undefined;
    updateMut.mutate(
      { testId: updated.key, body: vmToUpdateRequest(updated, status) },
      { onError: () => toast.error(t('Failed to update test')) },
    );
  };
  const removeTest = (key: string) => {
    deleteMut.mutate(key, {
      onError: () => toast.error(t('Failed to delete test')),
    });
    setSelectedKeys((prev) => prev.filter((k) => k !== key));
    setOpenKey((k) => (k === key ? null : k));
  };

  const openRow = (tc: TestCase) => {
    setFocusSchedule(false);
    setOpenKey(tc.key);
    // opening a test stamps `seenAt` server-side (GET /tests/{id}), which clears the
    // "new" dot; refresh the list once so it reflects. Only needed while unseen.
    if (tc.isNew)
      apiGetTest(projectId, tc.key)
        .then(invalidateAll)
        .catch(() => {});
  };
  const openSchedule = (tc: TestCase) => {
    setOpenKey(tc.key);
    setFocusSchedule(true);
  };
  const unschedule = (tc: TestCase) =>
    updateTest({ ...tc, status: 'approved', schedule: null });

  // Manual creation — a hand-made test skips the draft flow and starts life `approved`.
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
      // create seeds the status directly (approved for a manual test) — no follow-up PUT
      await apiCreateTest(projectId, vmToCreateRequest(intended));
      message.success(t('Test created'));
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
      .then(() => message.success(t('Duplicated as a draft')))
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

  // Normally the open test is on the current page; on a deep link (?test=) it may live on
  // another page or under a filter, so fetch it by id as a fallback.
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
    setOpenKey((k) => (k && testIds.includes(k) ? null : k));
    bulkMut.mutate(
      { testIds, action: 'delete' },
      { onError: () => toast.error(t('Failed to delete test')) },
    );
  };

  // Escape hatch for a test stuck "needs review" with no suggestion to activate/dismiss —
  // clears the runner-owned flag (api4 PUT needsReview:false).
  const clearReview = (tc: TestCase) =>
    updateMut.mutate(
      { testId: tc.key, body: { needsReview: false } },
      { onError: () => toast.error(t('Failed to update test')) },
    );

  const runNow = (tc: TestCase) => {
    if (reviewBlocked(tc)) return;
    triggerMut.mutate(tc.key, {
      onSuccess: () =>
        message.success(`${tc.title} — ${t('run started, see Runs')}`),
      onError: () => toast.error(t('Failed to start run')),
    });
  };

  const faded = (n: number) => (
    <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>
  );
  const statusOptions = [
    { value: 'all', label: <span>{t('All')}{faded(allCount)}</span> },
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
    { value: 'draft', label: <span>{t('Drafts')}{faded(draftCount)}</span> },
    {
      value: 'approved',
      label: <span>{t('Approved')}{faded(approvedCount)}</span>,
    },
    { value: 'active', label: <span>{t('Active')}{faded(activeCount)}</span> },
    { value: 'paused', label: <span>{t('Paused')}{faded(pausedCount)}</span> },
  ];

  const rowMenu = (tc: TestCase) => {
    let items;
    if (tc.status === 'draft') {
      items = [
        { key: 'open', label: t('Review draft') },
        { type: 'divider' as const },
        { key: 'dismiss', label: t('Dismiss'), danger: true },
      ];
    } else {
      const controls: {
        key: string;
        label: React.ReactNode;
        disabled?: boolean;
      }[] = [];
      // a needs-review test (with pause-on-revision) is frozen until reviewed — no run
      // controls, just the review-first "open" entry below
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
        if (tc.status === 'approved')
          controls.push({ key: 'schedule', label: t('Schedule') });
        if (tc.status === 'active' || tc.status === 'paused')
          controls.push({ key: 'unschedule', label: t('Unschedule') });
      }
      items = [
        ...controls,
        // the drawer opens straight into the review while one is pending
        {
          key: 'open',
          label: needsReview(tc) ? t('Review changes') : t('Settings'),
        },
        // stuck "needs review" with no suggestion to act on → clear the flag directly
        ...(tc.needsReview && !tc.pendingRevision
          ? [{ key: 'markReviewed', label: t('Mark as reviewed') }]
          : []),
        { key: 'duplicate', label: t('Duplicate') },
        { type: 'divider' as const },
        { key: 'delete', label: t('Delete'), danger: true },
      ];
    }
    return {
      items,
      onClick: ({ key, domEvent }: { key: string; domEvent: any }) => {
        domEvent.stopPropagation();
        if (key === 'open') openRow(tc);
        else if (key === 'schedule') openSchedule(tc);
        else if (key === 'unschedule') unschedule(tc);
        else if (key === 'duplicate') duplicateTest(tc);
        else if (key === 'pause') updateTest({ ...tc, status: 'paused' });
        else if (key === 'resume') updateTest({ ...tc, status: 'active' });
        else if (key === 'markReviewed') clearReview(tc);
        else if (key === 'dismiss' || key === 'delete') removeTest(tc.key);
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
          <Tooltip title={scheduleLabel(tc.schedule)}>
            <span className="flex items-center gap-1.5 text-gray-dark">
              <Calendar size={13} className="shrink-0 text-gray-medium" />
              <span className="truncate">{scheduleShort(tc.schedule)}</span>
            </span>
          </Tooltip>
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

  // first-run / empty state — only when there are genuinely no tests (no filter active)
  const noTests = total === 0 && statusTab === 'all' && !search;
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
            <Button size="small" danger onClick={deleteSelected}>
              {t('Delete')} ({selectedKeys.length})
            </Button>
            <Button size="small" type="text" onClick={() => setSelectedKeys([])}>
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
            <Select
              size="small"
              value={periodFilter}
              onChange={setPeriodFilter}
              style={{ width: 130 }}
              options={PERIOD_OPTIONS.map((o) => ({
                value: o.value,
                label: t(o.label),
              }))}
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

      <DraftDrawer
        key={`draft-${openKey ?? 'none'}`}
        test={openTest?.status === 'draft' ? openTest : null}
        open={openTest?.status === 'draft'}
        defaults={defaults}
        onClose={() => setOpenKey(null)}
        onChange={updateTest}
        onRemove={removeTest}
      />
      <TestDrawer
        key={
          creating ? `test-new-${draftTest?.key}` : `test-${openKey ?? 'none'}`
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
          setOpenKey(null);
          setFocusSchedule(false);
        }}
        onChange={creating ? setDraftTest : updateTest}
        onRemove={removeTest}
      />
    </div>
  );
}

export default TestsTab;
