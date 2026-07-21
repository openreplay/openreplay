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
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';

import FullPagination from 'Shared/FullPagination';

import {
  useAllRuns,
  useEnvironments,
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
import { useQueryParam } from './shared/useUrlState';
import {
  PERIOD_OPTIONS,
  REGION_OPTIONS,
  RESOLUTION_OPTIONS,
  RowTags,
  VersionLabel,
  formatDuration,
  getRunResult,
  periodFrom,
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
// (accurate badges); the status filter sends the bucket as a comma list (api4 any-of), so
// running/failed filter every underlying status server-side.
const BUCKET_STATUSES: Record<UiRunStatus, RunStatus[]> = {
  running: ['dispatched', 'running'],
  failed: ['failed', 'error', 'timeout'],
  passed: ['passed'],
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
  const { data: envData } = useEnvironments({ limit: 100 });
  const envNameById = new Map(
    (envData?.items ?? []).map((e) => [e.environmentId, e.name]),
  );
  const envOptions = (envData?.items ?? []).map((e) => ({
    value: e.environmentId,
    label: e.name,
  }));

  // A test drawer's "View all runs" / "View" shortcut sets a handoff (fresh handoffId)
  // and switches here. Adopt it as the search / open run — at mount and again whenever
  // handoffId changes (this pane stays mounted between visits).
  const { runsTestFilter, runsOpenRunKey, handoffId } = useKaiUi();
  // the opened run drawer IS the ?run= param — open iff present. No separate state, so
  // browser back/forward just open/close it (no state↔URL sync loop).
  const [openKey, setOpenKey] = useQueryParam('run');
  const [query, setQuery] = useState(runsTestFilter ?? '');
  const [search, setSearch] = useState(runsTestFilter ?? '');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [resFilter, setResFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [dispatchFilter, setDispatchFilter] = useState('all');
  const [sortBy, setSortBy] = useState<{
    field?: string;
    order?: 'ascend' | 'descend';
  }>({ field: 'date', order: 'descend' });
  const [page, setPage] = useState(1);

  // adopt a cross-tab handoff ("View all runs" / "View run") exactly once when handoffId
  // bumps — reset the filters and open the handed-off run in the URL (this pane stays
  // mounted between visits, so a fresh id is the signal).
  const seenHandoffRef = useRef(handoffId);
  useEffect(() => {
    if (seenHandoffRef.current === handoffId) return;
    seenHandoffRef.current = handoffId;
    setQuery(runsTestFilter ?? '');
    setSearch(runsTestFilter ?? '');
    setStatusTab('all');
    // opening a handed-off run pushes an entry so Back returns to the list
    setOpenKey(runsOpenRunKey ?? undefined, !!runsOpenRunKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffId]);

  // debounce the search box (setState in a timer callback, not sync in the effect body)
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  // filters shared by the list + the count aggregates (everything except the status tab).
  // Memoize `from` per period — periodFrom() is Date.now()-based, so recomputing it every
  // render produced a new value → new query key → refetch → re-render → request loop (429).
  const from = useMemo(() => periodFrom(periodFilter), [periodFilter]);
  const filters = {
    name: search || undefined,
    screenType: resFilter !== 'all' ? resFilter : undefined,
    dispatchMode: dispatchFilter !== 'all' ? dispatchFilter : undefined,
    tags: tagFilter !== 'all' ? tagFilter : undefined,
    environmentId: envFilter !== 'all' ? envFilter : undefined,
    region: regionFilter !== 'all' ? regionFilter : undefined,
    from,
  };

  const sortField = sortBy.field ? SORT_FIELD[sortBy.field] : undefined;
  const listParams: ListAllRunsParams = {
    page,
    limit: PAGE_SIZE,
    ...filters,
    status:
      statusTab !== 'all' ? BUCKET_STATUSES[statusTab].join(',') : undefined,
    ...(sortField && sortBy.order
      ? { sortField, sortOrder: sortBy.order === 'ascend' ? 'asc' : 'desc' }
      : {}),
  };

  const { data: runsData, isPending } = useAllRuns(listParams);
  // status counts ignore the active status tab so every tab shows its own total
  const { data: statusCounts } = useRunCounts('status', filters);
  // dispatch-mode options come from the count buckets (excludes the unset "" bucket)
  const { data: dispatchCounts } = useRunCounts('dispatchMode', {
    name: filters.name,
    from,
  });
  const dispatchModes = (dispatchCounts?.buckets ?? [])
    .map((b) => b.value)
    .filter(Boolean);
  // tag options come from the tag count buckets (owning test's tags), sharing the
  // name/period filters so the list stays honest
  const { data: tagCounts } = useRunCounts('tags', { name: filters.name, from });
  const tagOptions = (tagCounts?.buckets ?? [])
    .map((b) => b.value)
    .filter(Boolean);

  // reset to page 1 whenever a filter changes (sort resets page in onChange)
  const filterKey = `${search}|${statusTab}|${resFilter}|${periodFilter}|${dispatchFilter}|${tagFilter}|${envFilter}|${regionFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const runs = (runsData?.items ?? []).map((run) =>
    apiRunToVM(run, undefined, envNameById),
  );
  const total = runsData?.total ?? 0;

  const { data: detail } = useRun(openKey ?? undefined);
  const openRun: RunData | null = openKey
    ? detail
      ? apiRunDetailToVM(detail, envNameById)
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
      render: (name: string, run) => (
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{name}</span>
          <VersionLabel version={run.version ?? undefined} />
        </span>
      ),
    },
    {
      title: t('Tags'),
      dataIndex: 'tags',
      width: 160,
      render: (tags: string[]) => <RowTags tags={tags} />,
    },
    {
      title: t('Environment'),
      dataIndex: 'envName',
      width: 140,
      render: (envName?: string) =>
        envName ? (
          <span className="text-gray-dark truncate">{envName}</span>
        ) : (
          <span className="text-disabled-text italic">{t('Not set')}</span>
        ),
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
            style={{ width: 170 }}
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
          <Select
            size="small"
            value={tagFilter}
            onChange={setTagFilter}
            style={{ width: 130 }}
            options={[
              { value: 'all', label: t('All tags') },
              ...tagOptions.map((tag) => ({ value: tag, label: tag })),
            ]}
          />
          {envOptions.length > 0 && (
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
          )}
          <Select
            size="small"
            value={regionFilter}
            onChange={setRegionFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: t('All regions') },
              ...REGION_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
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
            setOpenKey(run.key, true);
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
