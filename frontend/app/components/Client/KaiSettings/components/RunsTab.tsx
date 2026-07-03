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
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';

import FullPagination from 'Shared/FullPagination';

import { useAllRuns, useRun, useTests } from '../queries';
import RunDrawer from './drawers/RunDrawer';
import './kai-table.css';
import { apiRunDetailToVM, apiRunToVM } from './shared/adapters';
import { RunData, UiRunStatus } from './shared/types';
import { useKaiUi } from './shared/uiStore';
import {
  RESOLUTION_OPTIONS,
  RowTags,
  formatDuration,
  getRunResult,
  relativeTime,
} from './shared/utils';

type StatusTab = 'all' | UiRunStatus;
const RESULT_ORDER: Record<UiRunStatus, number> = {
  running: 0,
  failed: 1,
  passed: 2,
};
// The runs list is fetched once and filtered/sorted/paginated client-side; the API
// clamps `limit` to 100, so lists larger than this show a "first N" note (see below).
const LOOKUP_LIMIT = 100;

// Client-side sort over the whole filtered list (then paginated), keyed by dataIndex.
const RUN_COMPARATORS: Record<string, (a: RunData, b: RunData) => number> = {
  status: (a, b) => RESULT_ORDER[a.status] - RESULT_ORDER[b.status],
  testName: (a, b) => a.testName.localeCompare(b.testName),
  envName: (a, b) => (a.envName ?? '').localeCompare(b.envName ?? ''),
  duration: (a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity),
  date: (a, b) => a.date - b.date,
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
  const { data: runsData, isPending } = useAllRuns({ limit: LOOKUP_LIMIT });
  const { data: testsData } = useTests({ limit: LOOKUP_LIMIT });

  // A test drawer's "View all runs" / "View" shortcut sets a handoff on the ui store
  // (a fresh `handoffId`) and switches to this tab. Adopt it as the search / open run:
  // at mount for a handoff that arrived with the switch, and — since this pane stays
  // mounted between visits — again whenever `handoffId` changes (React's supported
  // "adjust state on external change during render" pattern, no effect).
  const { runsTestFilter, runsOpenRunKey, handoffId } = useKaiUi();
  const [query, setQuery] = useState(runsTestFilter ?? '');
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
    setStatusTab('all');
    setOpenKey(runsOpenRunKey ?? null);
  }

  const PAGE_SIZE = 20;
  // Reset to page 1 when a filter changes — during render, not in an effect.
  const filterKey = `${query}|${statusTab}|${resFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const testNameById = useMemo(
    () => new Map((testsData?.items ?? []).map((tc) => [tc.testId, tc.name])),
    [testsData],
  );

  const runs = useMemo(
    () =>
      (runsData?.items ?? []).map((run) =>
        apiRunToVM(run, testNameById.get(run.testId)),
      ),
    [runsData, testNameById],
  );

  const { data: detail } = useRun(openKey ?? undefined);
  const openRun: RunData | null = openKey
    ? detail
      ? apiRunDetailToVM(detail)
      : (runs.find((r) => r.key === openKey) ?? null)
    : null;

  const runningCount = runs.filter((r) => r.status === 'running').length;
  const failedCount = runs.filter((r) => r.status === 'failed').length;
  const passedCount = runs.filter((r) => r.status === 'passed').length;

  const visible = useMemo(() => {
    let arr = runs;
    if (query.trim())
      arr = arr.filter((r) =>
        r.testName.toLowerCase().includes(query.toLowerCase()),
      );
    if (statusTab !== 'all') arr = arr.filter((r) => r.status === statusTab);
    if (resFilter !== 'all')
      arr = arr.filter((r) => (r.resolution ?? 'desktop') === resFilter);
    return arr;
  }, [runs, query, statusTab, resFilter]);

  const sorted = useMemo(() => {
    const cmp = sortBy.field ? RUN_COMPARATORS[sortBy.field] : undefined;
    if (!cmp || !sortBy.order) return visible;
    const arr = [...visible].sort(cmp);
    return sortBy.order === 'descend' ? arr.reverse() : arr;
  }, [visible, sortBy]);

  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // The API caps a page at LOOKUP_LIMIT; warn when more runs exist than we loaded.
  const truncated = (runsData?.total ?? 0) > runs.length;

  const rerun = (run: RunData) =>
    message.success(`${run.testName} — ${t('rerun started, see Runs')}`);

  const faded = (n: number) => (
    <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>
  );
  const statusOptions = [
    {
      value: 'all',
      label: (
        <span>
          {t('All')}
          {faded(runs.length)}
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
      sorter: true,
      showSorterTooltip: false,
      render: (status: UiRunStatus) => getRunResult(status, t),
    },
    {
      title: t('Test'),
      dataIndex: 'testName',
      sorter: true,
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
      title: t('Environment'),
      dataIndex: 'envName',
      width: 150,
      sorter: true,
      showSorterTooltip: false,
      render: (env?: string) =>
        env ? (
          <span className="text-gray-dark">{env}</span>
        ) : (
          <span className="text-disabled-text">—</span>
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

      {truncated && (
        <div className="px-4 py-2 text-xs text-disabled-text border-b">
          {t(
            'Showing the {{count}} most recent runs — refine with search or filters.',
            {
              count: runs.length,
            },
          )}
        </div>
      )}

      <Table<RunData>
        className="kai-table"
        rowKey="key"
        columns={columns}
        dataSource={pageItems}
        pagination={false}
        rowClassName="cursor-pointer"
        onChange={(_p, _f, sorter) => {
          const s = Array.isArray(sorter) ? sorter[0] : sorter;
          setSortBy({ field: s.field as string, order: s.order ?? undefined });
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

      {visible.length > 0 && (
        <FullPagination
          page={page}
          limit={PAGE_SIZE}
          total={visible.length}
          listLen={pageItems.length}
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
