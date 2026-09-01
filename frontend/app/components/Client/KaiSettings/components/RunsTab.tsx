import {
  Button,
  Input,
  Segmented,
  Select,
  Skeleton,
  Table,
  Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { RotateCw } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

import { formatDateTimeDefault } from 'App/date';

import CountSuffix from 'Shared/CountSuffix';
import FullPagination from 'Shared/FullPagination';

import {
  RUNS_LIST_POLL_MS,
  RUNS_PENDING_POLL_MS,
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
import { kaiUi, useKaiUi } from './shared/uiStore';
import { useQueryParam } from './shared/useUrlState';
import {
  LOOKUP_LIMIT,
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
// The 3 coarse UI buckets over the 6 API run statuses. Counts collapse all of them, and
// the status filter sends the bucket as a comma list (any-of), so the filter and the
// badges agree with what the rows render.
const BUCKET_STATUSES: Record<UiRunStatus, RunStatus[]> = {
  running: ['dispatched', 'running'],
  failed: ['failed', 'error', 'timeout'],
  passed: ['passed'],
};
// How long the table waits for a just-triggered run before giving up and rendering
// without it (the runner normally dispatches within a second or two).
const TRIGGER_HOLD_MS = 12000;
// A trigger's row counts as landed when it's in flight, or when any run of that test
// started at/after the trigger (a very short run can finish before we ever poll).
const LANDED_SLACK_MS = 5000;

/** Live elapsed counter for an in-flight run. */
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
  const { data: envData } = useEnvironments({ limit: LOOKUP_LIMIT });
  const envNameById = useMemo(
    () => new Map((envData?.items ?? []).map((e) => [e.environmentId, e.name])),
    [envData],
  );
  const envOptions = (envData?.items ?? []).map((e) => ({
    value: e.environmentId,
    label: e.name,
  }));

  // A test drawer's "View all runs" / "View" shortcut sets a handoff (fresh handoffId)
  // and switches here.
  const { runsTestFilter, runsOpenRunKey, handoffId, pendingRuns, activeTab } =
    useKaiUi();
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
  const [periodFilter, setPeriodFilter] = useState('7');
  const [sortBy, setSortBy] = useState<{
    field?: string;
    order?: 'ascend' | 'descend';
  }>({ field: 'date', order: 'descend' });
  const [page, setPage] = useState(1);

  // adopt a cross-tab handoff exactly once when handoffId bumps — this pane stays
  // mounted between visits, so a fresh id is the signal
  const seenHandoffRef = useRef(handoffId);
  useEffect(() => {
    if (seenHandoffRef.current === handoffId) return;
    seenHandoffRef.current = handoffId;
    setQuery(runsTestFilter ?? '');
    setSearch(runsTestFilter ?? '');
    setStatusTab('all');
    // opening a handed-off run pushes an entry so Back returns to the list
    setOpenKey(runsOpenRunKey ?? undefined, !!runsOpenRunKey);
  }, [handoffId]);

  // debounce the search box (setState in a timer callback, not sync in the effect body)
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  // Memoize `from` per period — periodFrom() is Date.now()-based, so recomputing it
  // every render produced a new value → new query key → refetch → re-render loop (429).
  const from = useMemo(() => periodFrom(periodFilter), [periodFilter]);
  const filters = {
    name: search || undefined,
    screenType: resFilter !== 'all' ? resFilter : undefined,
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

  // Only the visible tab polls — this pane stays mounted behind the others. A trigger
  // waiting to surface polls fast, then the list settles back to its slow heartbeat so a
  // scheduled run or a finishing one shows up without a reload.
  const waitingForTrigger = Object.keys(pendingRuns).length > 0;
  const pollMs =
    activeTab !== 'runs'
      ? (false as const)
      : waitingForTrigger
        ? RUNS_PENDING_POLL_MS
        : RUNS_LIST_POLL_MS;

  const { data: runsData, isPending } = useAllRuns(listParams, pollMs);
  // status counts ignore the active status tab so every tab shows its own total
  const { data: statusCounts } = useRunCounts('status', filters, pollMs);
  // tag options come from the owning tests' tags, sharing the name/period filters
  const { data: tagCounts } = useRunCounts('tags', {
    name: filters.name,
    from,
  });
  const tagOptions = (tagCounts?.buckets ?? [])
    .map((b) => b.value)
    .filter(Boolean);

  // reset to page 1 whenever a filter changes (sort resets page in onChange)
  const filterKey = `${search}|${statusTab}|${resFilter}|${periodFilter}|${tagFilter}|${envFilter}|${regionFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const runs = (runsData?.items ?? []).map((run) =>
    apiRunToVM(run, undefined, envNameById),
  );
  const total = runsData?.total ?? 0;

  // Retire each pending trigger as soon as its run is on screen — or when the wait runs
  // out, so a filter that can't show it (another status tab, another page) never holds
  // the table open-endedly.
  useEffect(() => {
    const ids = Object.keys(pendingRuns);
    if (!ids.length) return undefined;
    const landed = ids.filter((id) =>
      runs.some(
        (r) =>
          r.testId === id &&
          (r.status === 'running' ||
            r.date >= pendingRuns[id] - LANDED_SLACK_MS),
      ),
    );
    landed.forEach(kaiUi.clearRunTriggered);
    const waiting = ids.filter((id) => !landed.includes(id));
    if (!waiting.length) return undefined;
    const oldest = Math.min(...waiting.map((id) => pendingRuns[id]));
    const timer = window.setTimeout(
      () => waiting.forEach(kaiUi.clearRunTriggered),
      Math.max(0, TRIGGER_HOLD_MS - (Date.now() - oldest)),
    );
    return () => window.clearTimeout(timer);
  }, [pendingRuns, runsData]);

  // Hold the loading state rather than render a table the triggered run is missing from
  // — but only where it could actually appear (newest-first page 1, a tab that shows it).
  const holdingForTrigger =
    waitingForTrigger &&
    page === 1 &&
    (statusTab === 'all' || statusTab === 'running') &&
    !(sortBy.field === 'duration' || sortBy.order === 'ascend');

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
        toast.success(`${run.testName} — ${t('rerun started, see Runs')}`),
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
    {
      value: 'running',
      label: (
        <span>
          {t('Running')}
          {faded(runningCount)}
        </span>
      ),
    },
    {
      value: 'failed',
      label: (
        <span>
          {t('Failed')}
          {faded(failedCount)}
        </span>
      ),
    },
    {
      value: 'passed',
      label: (
        <span>
          {t('Passed')}
          {faded(passedCount)}
        </span>
      ),
    },
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
          <span className="text-disabled-text">{relativeTime(t, date)}</span>
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

  if (isPending || holdingForTrigger) {
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
            value={regionFilter}
            onChange={setRegionFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: t('All regions') },
              ...REGION_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              })),
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
