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
import { Calendar, EllipsisVertical, Play, Radar } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import FullPagination from 'Shared/FullPagination';

import {
  deleteTest as apiDeleteTest,
  updateTest as apiUpdateTest,
} from '../api';
import {
  browserTestsKeys,
  useDeleteTest,
  useEnvironments,
  useProjectId,
  useTests,
  useUpdateTest,
} from '../queries';
import DraftDrawer from './drawers/DraftDrawer';
import TestDrawer from './drawers/TestDrawer';
import './kai-table.css';
import { apiTestToVM, vmToUpdateRequest } from './shared/adapters';
import { TestCase, TestLifecycle } from './shared/types';
import {
  RowTags,
  getStatusTag,
  isScheduled,
  scheduleLabel,
  scheduleShort,
} from './shared/utils';

type StatusTab = 'all' | TestLifecycle;
const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  approved: 1,
  active: 2,
  paused: 3,
};
// Tests are fetched once and filtered/sorted/paginated client-side; the API clamps
// `limit` to 100, so larger lists show a "first N" note.
const LOOKUP_LIMIT = 100;

// Sort is done client-side over the whole filtered list (then paginated), so the
// column comparators live here rather than on the antd columns (which would only see
// the current page). Keyed by column dataIndex.
const TEST_COMPARATORS: Record<string, (a: TestCase, b: TestCase) => number> = {
  title: (a, b) => a.title.localeCompare(b.title),
  envNames: (a, b) =>
    (a.envNames?.[0] ?? '').localeCompare(b.envNames?.[0] ?? ''),
  schedule: (a, b) =>
    scheduleLabel(a.schedule).localeCompare(scheduleLabel(b.schedule)),
  status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
};

function TestsTab() {
  const { t } = useTranslation();
  const { data, isPending } = useTests({ limit: LOOKUP_LIMIT });
  const { data: envData } = useEnvironments({ limit: LOOKUP_LIMIT });
  const updateMut = useUpdateTest();
  const deleteMut = useDeleteTest();
  const projectId = useProjectId();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [sortBy, setSortBy] = useState<{
    field?: string;
    order?: 'ascend' | 'descend';
  }>({});
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(null);
  // when a drawer is opened via the "Schedule" action, jump straight to the schedule
  const [focusSchedule, setFocusSchedule] = useState(false);

  const PAGE_SIZE = 20;
  // Reset to page 1 when a filter changes — done during render (React's supported
  // "adjust state on prop/state change" pattern) rather than in an effect.
  const filterKey = `${query}|${statusTab}|${envFilter}|${tagFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const envNameById = useMemo(
    () => new Map((envData?.items ?? []).map((e) => [e.environmentId, e.name])),
    [envData],
  );

  // Rejected tests are dismissed drafts — they have no place in the redesign.
  const tests = useMemo(
    () =>
      (data?.items ?? [])
        .filter((tc) => tc.status !== 'rejected')
        .map((tc) => apiTestToVM(tc, envNameById)),
    [data, envNameById],
  );

  // ---- persistence (each edit is an update/delete mutation) -----------------
  const updateTest = (updated: TestCase) =>
    updateMut.mutate(
      { testId: updated.key, body: vmToUpdateRequest(updated) },
      { onError: () => toast.error(t('Failed to update test')) },
    );
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
  };
  const openSchedule = (tc: TestCase) => {
    setOpenKey(tc.key);
    setFocusSchedule(true);
  };
  // drop the schedule → the test goes back to "approved" (ready, not scheduled)
  const unschedule = (tc: TestCase) =>
    updateTest({ ...tc, status: 'approved', schedule: null });

  const openTest = tests.find((tc) => tc.key === openKey) ?? null;

  const draftCount = tests.filter((tc) => tc.status === 'draft').length;
  const approvedCount = tests.filter((tc) => tc.status === 'approved').length;
  const activeCount = tests.filter((tc) => tc.status === 'active').length;
  const pausedCount = tests.filter((tc) => tc.status === 'paused').length;

  const envOptions = (envData?.items ?? []).map((e) => ({
    value: e.environmentId,
    label: e.name,
  }));
  const allTags = Array.from(
    new Set(tests.flatMap((tc) => tc.tags ?? [])),
  ).sort();

  const visible = useMemo(() => {
    let arr = tests;
    if (query.trim())
      arr = arr.filter((tc) =>
        tc.title.toLowerCase().includes(query.toLowerCase()),
      );
    if (statusTab !== 'all') arr = arr.filter((tc) => tc.status === statusTab);
    if (envFilter !== 'all')
      arr = arr.filter((tc) => (tc.environments ?? []).includes(envFilter));
    if (tagFilter !== 'all')
      arr = arr.filter((tc) => (tc.tags ?? []).includes(tagFilter));
    // drafts float to the top by default; column sort overrides this on click
    const drafts = arr.filter((tc) => tc.status === 'draft');
    const rest = arr.filter((tc) => tc.status !== 'draft');
    return [...drafts, ...rest];
  }, [tests, query, statusTab, envFilter, tagFilter]);

  // Column sort applies to the whole filtered list; without an active sort the
  // drafts-first order from `visible` is kept.
  const sorted = useMemo(() => {
    const cmp = sortBy.field ? TEST_COMPARATORS[sortBy.field] : undefined;
    if (!cmp || !sortBy.order) return visible;
    const arr = [...visible].sort(cmp);
    return sortBy.order === 'descend' ? arr.reverse() : arr;
  }, [visible, sortBy]);

  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // The API caps a page at LOOKUP_LIMIT; warn when more tests exist than we loaded.
  const truncated = (data?.total ?? 0) > tests.length;

  // ---- bulk actions over the current selection -------------------------
  const selected = tests.filter((tc) => selectedKeys.includes(tc.key));
  const selDrafts = selected.filter((tc) => tc.status === 'draft').length;
  const selActive = selected.filter((tc) => tc.status === 'active').length;
  const selPaused = selected.filter((tc) => tc.status === 'paused').length;

  const invalidateAll = () =>
    queryClient.invalidateQueries({
      queryKey: browserTestsKeys.all(projectId),
    });

  // Bulk actions fire the mutations directly (not via the single-item hooks) so the
  // whole batch runs, then the list is invalidated once instead of per item.
  const bulkUpdate = async (
    predicate: (tc: TestCase) => boolean,
    patch: (tc: TestCase) => Partial<TestCase>,
  ) => {
    const targets = selected.filter(predicate);
    setSelectedKeys([]);
    if (!targets.length) return;
    const results = await Promise.allSettled(
      targets.map((tc) =>
        apiUpdateTest(
          projectId,
          tc.key,
          vmToUpdateRequest({ ...tc, ...patch(tc) }),
        ),
      ),
    );
    if (results.some((r) => r.status === 'rejected'))
      toast.error(t('Some tests could not be updated'));
    invalidateAll();
  };
  // Bulk approve can't gather a schedule per test, so drafts land in `approved`.
  const approveSelected = () => {
    void bulkUpdate(
      (tc) => tc.status === 'draft',
      () => ({ status: 'approved' }),
    );
    message.success(t('Drafts approved'));
  };
  const pauseSelected = () =>
    void bulkUpdate(
      (tc) => tc.status === 'active',
      () => ({ status: 'paused' }),
    );
  const resumeSelected = () =>
    void bulkUpdate(
      (tc) => tc.status === 'paused',
      (tc) => ({ status: isScheduled(tc.schedule) ? 'active' : 'approved' }),
    );
  const deleteSelected = async () => {
    const keys = selectedKeys.map(String);
    setSelectedKeys([]);
    setOpenKey((k) => (k && keys.includes(k) ? null : k));
    const results = await Promise.allSettled(
      keys.map((k) => apiDeleteTest(projectId, k)),
    );
    if (results.some((r) => r.status === 'rejected'))
      toast.error(t('Failed to delete test'));
    invalidateAll();
  };

  const runNow = (tc: TestCase) =>
    message.success(`${tc.title} — ${t('run started, see Runs')}`);

  const faded = (n: number) => (
    <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>
  );
  const statusOptions = [
    {
      value: 'all',
      label: (
        <span>
          {t('All')}
          {faded(tests.length)}
        </span>
      ),
    },
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
        { type: 'divider' as const },
        { key: 'dismiss', label: t('Dismiss'), danger: true },
      ];
    } else {
      const controls: { key: string; label: string }[] = [];
      if (tc.status === 'active')
        controls.push({ key: 'pause', label: t('Pause') });
      if (tc.status === 'paused')
        controls.push({ key: 'resume', label: t('Resume') });
      if (tc.status === 'approved')
        controls.push({ key: 'schedule', label: t('Schedule') });
      if (tc.status === 'active' || tc.status === 'paused')
        controls.push({ key: 'unschedule', label: t('Unschedule') });
      items = [
        ...controls,
        { key: 'open', label: t('Settings') },
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
        else if (key === 'pause') updateTest({ ...tc, status: 'paused' });
        else if (key === 'resume')
          updateTest({
            ...tc,
            status: isScheduled(tc.schedule) ? 'active' : 'approved',
          });
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
          {tc.status === 'draft' && tc.isNew && (
            <Tooltip title={t('New — not reviewed yet')}>
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
      sorter: true,
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
      sorter: true,
      showSorterTooltip: false,
      render: (_: unknown, tc) =>
        tc.status === 'draft' ? (
          <span className="text-disabled-text">—</span>
        ) : !isScheduled(tc.schedule) ? (
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
      width: 110,
      sorter: true,
      showSorterTooltip: false,
      render: (status: TestLifecycle) => getStatusTag(status, t),
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 104,
      align: 'right',
      render: (_: unknown, tc) => (
        <div className="flex items-center justify-end">
          {tc.status !== 'draft' && (
            <Tooltip title={t('Run now')}>
              <Button
                type="text"
                icon={<Play size={16} />}
                aria-label={t('Run now')}
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

  // first-run / empty state
  if (tests.length === 0) {
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
        <span className="text-xs text-disabled-text">
          {t('Nothing to set up — drafts will appear as they are ready.')}
        </span>
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
        {/* selecting rows swaps the filters out for bulk actions */}
        {selectedKeys.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-disabled-text">
              {selectedKeys.length} {t('selected')}
            </span>
            {selDrafts > 0 && (
              <Button size="small" onClick={approveSelected}>
                {t('Approve')} ({selDrafts})
              </Button>
            )}
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
              style={{ width: 200 }}
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
          </div>
        )}
      </div>

      {truncated && (
        <div className="px-4 py-2 text-xs text-disabled-text border-b">
          {t(
            'Showing the first {{count}} tests — refine with search or filters.',
            {
              count: tests.length,
            },
          )}
        </div>
      )}

      <Table<TestCase>
        className="kai-table"
        rowKey="key"
        columns={columns}
        dataSource={pageItems}
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

      {visible.length > 0 && (
        <FullPagination
          page={page}
          limit={PAGE_SIZE}
          total={visible.length}
          listLen={pageItems.length}
          onPageChange={setPage}
          entity="tests"
        />
      )}

      {/* one drawer instance; draft vs test is decided by the opened row's status. The
          `key` remounts the drawer per opened test so its local draft state resets fresh. */}
      <DraftDrawer
        key={`draft-${openKey ?? 'none'}`}
        test={openTest?.status === 'draft' ? openTest : null}
        open={openTest?.status === 'draft'}
        onClose={() => setOpenKey(null)}
        onChange={updateTest}
        onRemove={removeTest}
      />
      <TestDrawer
        key={`test-${openKey ?? 'none'}`}
        test={openTest && openTest.status !== 'draft' ? openTest : null}
        open={!!openTest && openTest.status !== 'draft'}
        focusSchedule={focusSchedule}
        onClose={() => {
          setOpenKey(null);
          setFocusSchedule(false);
        }}
        onChange={updateTest}
        onRemove={removeTest}
      />
    </div>
  );
}

export default TestsTab;
