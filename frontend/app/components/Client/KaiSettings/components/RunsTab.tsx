import {
  Button,
  Input,
  Segmented,
  Select,
  Skeleton,
  Table,
  Tooltip,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { RotateCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';

import FullPagination from 'Shared/FullPagination';

import {
  useAllRuns,
  useRun,
  useRunCounts,
  useTriggerRun,
} from '../queries';
import RunDrawer from './drawers/RunDrawer';
import './kai-table.css';
import { apiRunDetailToVM, apiRunToVM } from './shared/adapters';
import {
  ListAllRunsParams,
  RunData,
  RunStatus,
  UiRunStatus,
} from './shared/types';
import { useKaiUi } from './shared/uiStore';
import {
  RESOLUTION_OPTIONS,
  RowTags,
  formatDuration,
  getRunResult,
  relativeTime,
} from './shared/utils';

type StatusTab = 'all' | UiRunStatus;
const PAGE_SIZE = 20;
// antd column dataIndex → API sortField (only these two are server-sortable).
const SORT_FIELD: Record<string, ListAllRunsParams['sortField']> = {
  duration: 'duration_ms',
  date: 'started_at',
};
// The 3 coarse UI buckets over the 6 API run statuses. Counts collapse all of them
// (accurate badges); the status *filter* can only send one value, so it sends the
// representative — dispatched/error/timeout show under All only (see todo.md).
const BUCKET_STATUSES: Record<UiRunStatus, RunStatus[]> = {
  running: ['dispatched', 'running'],
  failed: ['failed', 'error', 'timeout'],
  passed: ['passed'],
};
const STATUS_PARAM: Record<UiRunStatus, RunStatus> = {
  running: 'running',
  failed: 'failed',
  passed: 'passed',
};

// Live elapsed counter for an in-flight run — ticks each second from its start time.
function LiveDuration({ start }: { start: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, Math.floor((now - start) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const label =
    h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  return <span className="text-indigo tabular-nums">{label}</span>;
}

function RunsTab() {
  const { t } = useTranslation();
  const triggerMut = useTriggerRun();

  // A test drawer's "View all runs" / "View" shortcut sets a handoff (fresh handoffId)
  // and switches here. Adopt it as the search / open run — at mount and again whenever
  // handoffId changes (this pane stays mounted between visits).
  const { runsTestFilter, runsOpenRunKey, handoffId } = useKaiUi();
  const [query, setQuery] = useState(runsTestFilter ?? '');
  const [search, setSearch] = useState(runsTestFilter ?? '');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [resFilter, setResFilter] = useState('all');
  const [sortBy, setSortBy] = useState<{
    field?: string;
    order?: 'ascend' | 'descend';
  }>({ field: 'date', order: 'descend' });
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(runsOpenRunKey ?? null);

  const [seenHandoff, setSeenHandoff] = useState(handoffId);
  if (handoffId !== seenHandoff) {
    setSeenHandoff(handoffId);
    setQuery(runsTestFilter ?? '');
    setSearch(runsTestFilter ?? '');
    setStatusTab('all');
    setOpenKey(runsOpenRunKey ?? null);
  }

  // debounce the search box (setState in a timer callback, not sync in the effect body)
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const sortField = sortBy.field ? SORT_FIELD[sortBy.field] : undefined;
  const listParams: ListAllRunsParams = {
    page,
    limit: PAGE_SIZE,
    name: search || undefined,
    screenType: resFilter !== 'all' ? resFilter : undefined,
    status: statusTab !== 'all' ? STATUS_PARAM[statusTab] : undefined,
    ...(sortField && sortBy.order
      ? { sortField, sortOrder: sortBy.order === 'ascend' ? 'asc' : 'desc' }
      : {}),
  };

  const { data: runsData, isPending } = useAllRuns(listParams);
  // status counts ignore the active status tab so every tab shows its own total
  const { data: statusCounts } = useRunCounts('status', {
    name: search || undefined,
    screenType: resFilter !== 'all' ? resFilter : undefined,
  });

  // reset to page 1 whenever a filter changes (sort resets page in onChange)
  const filterKey = `${search}|${statusTab}|${resFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const runs = (runsData?.items ?? []).map((run) => apiRunToVM(run));
  const total = runsData?.total ?? 0;

  const { data: detail } = useRun(openKey ?? undefined);
  const openRun: RunData | null = openKey
    ? detail
      ? apiRunDetailToVM(detail)
      : (runs.find((r) => r.key === openKey) ?? null)
    : null;

  const bucketCount = (bucket: UiRunStatus) =>
    BUCKET_STATUSES[bucket].reduce(
      (n, s) =>
        n + (statusCounts?.buckets.find((b) => b.value === s)?.count ?? 0),
      0,
    );
  const runningCount = bucketCount('running');
  const failedCount = bucketCount('failed');
  const passedCount = bucketCount('passed');
  const allCount = runningCount + failedCount + passedCount;

  const rerun = (run: RunData) => {
    if (!run.testId) return;
    triggerMut.mutate(run.testId, {
      onSuccess: () =>
        message.success(`${run.testName} — ${t('rerun started, see Runs')}`),
      onError: () => message.error(t('Failed to start run')),
    });
  };

  const faded = (n: number) => (
    <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>
  );
  const statusOptions = [
    { value: 'all', label: <span>{t('All')}{faded(allCount)}</span> },
    {
      value: 'running',
      label: <span>{t('Running')}{faded(runningCount)}</span>,
    },
    { value: 'failed', label: <span>{t('Failed')}{faded(failedCount)}</span> },
    { value: 'passed', label: <span>{t('Passed')}{faded(passedCount)}</span> },
  ];

  const columns: TableColumnsType<RunData> = [
    {
      title: t('Result'),
      dataIndex: 'status',
      width: 130,
      showSorterTooltip: false,
      render: (status: UiRunStatus) => getRunResult(status, t),
    },
    {
      title: t('Test'),
      dataIndex: 'testName',
      showSorterTooltip: false,
      render: (name: string) => (
        <span className="font-medium truncate">{name}</span>
      ),
    },
    {
      title: t('Tags'),
      dataIndex: 'tags',
      width: 190,
      render: (tags: string[]) => <RowTags tags={tags} />,
    },
    {
      title: t('Duration'),
      dataIndex: 'duration',
      width: 120,
      sorter: true,
      showSorterTooltip: false,
      render: (_: unknown, run) =>
        run.status === 'running' ? (
          <LiveDuration start={run.date} />
        ) : (
          <span className="text-disabled-text">
            {run.duration ? formatDuration(run.duration) : '—'}
          </span>
        ),
    },
    {
      title: t('When'),
      dataIndex: 'date',
      width: 150,
      defaultSortOrder: 'descend',
      sorter: true,
      showSorterTooltip: false,
      render: (date: number) => (
        <Tooltip title={formatDateTimeDefault(date)}>
          <span className="text-disabled-text">{relativeTime(date)}</span>
        </Tooltip>
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 64,
      align: 'right',
      render: (_: unknown, run) =>
        run.status === 'running' ? null : (
          <Tooltip title={t('Rerun')}>
            <Button
              type="text"
              icon={<RotateCw size={16} />}
              aria-label={t('Rerun')}
              onClick={(e) => {
                e.stopPropagation();
                rerun(run);
              }}
            />
          </Tooltip>
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
        <div className="flex items-center gap-2 flex-wrap">
          <Input.Search
            size="small"
            allowClear
            placeholder={t('Search runs')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 200 }}
          />
          <Select
            size="small"
            value={resFilter}
            onChange={setResFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: t('All viewports') },
              ...RESOLUTION_OPTIONS.map((o) => ({
                value: o.value,
                label: t(o.label),
              })),
            ]}
          />
        </div>
      </div>

      <Table<RunData>
        className="kai-table"
        rowKey="key"
        columns={columns}
        dataSource={runs}
        pagination={false}
        rowClassName="cursor-pointer"
        onChange={(_p, _f, sorter) => {
          const s = Array.isArray(sorter) ? sorter[0] : sorter;
          setSortBy({ field: s.field as string, order: s.order ?? undefined });
          setPage(1);
        }}
        onRow={(run) => ({
          onClick: (e) => {
            const el = e.target as HTMLElement;
            if (el.closest('button')) return;
            setOpenKey(run.key);
          },
        })}
        locale={{ emptyText: t('No runs match these filters.') }}
      />

      {total > 0 && (
        <FullPagination
          page={page}
          limit={PAGE_SIZE}
          total={total}
          listLen={runs.length}
          onPageChange={setPage}
          entity="runs"
        />
      )}

      <RunDrawer
        run={openRun}
        open={!!openKey}
        onClose={() => setOpenKey(null)}
      />
    </div>
  );
}

export default RunsTab;
