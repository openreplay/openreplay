import {
  Button,
  Input,
  Segmented,
  Select,
  Table,
  Tooltip,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { RotateCw } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateTimeDefault } from 'App/date';
import { Pagination } from 'UI';

import RunDrawer from './drawers/RunDrawer';
import './kai-table.css';
import { MOCK_RUNS } from './shared/mockData';
import { RunData, RunStatus } from './shared/types';
import {
  REGION_OPTIONS,
  RESOLUTION_OPTIONS,
  RowTags,
  formatDuration,
  getRunResult,
  relativeTime,
} from './shared/utils';

type StatusTab = 'all' | RunStatus;
const RESULT_ORDER: Record<RunStatus, number> = {
  running: 0,
  failed: 1,
  passed: 2,
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

const ENV_NAMES = Array.from(
  new Set(MOCK_RUNS.map((r) => r.envName).filter(Boolean)),
) as string[];
const TAG_NAMES = Array.from(
  new Set(MOCK_RUNS.flatMap((r) => r.tags ?? [])),
).sort();

function RunsTab() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [resFilter, setResFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const PAGE_SIZE = 20;
  // any filter change resets to page 1
  useEffect(() => {
    setPage(1);
  }, [query, statusTab, envFilter, tagFilter, resFilter, regionFilter]);

  const openRun = MOCK_RUNS.find((r) => r.key === openKey) ?? null;

  const runningCount = MOCK_RUNS.filter((r) => r.status === 'running').length;
  const failedCount = MOCK_RUNS.filter((r) => r.status === 'failed').length;
  const passedCount = MOCK_RUNS.filter((r) => r.status === 'passed').length;

  const visible = useMemo(() => {
    let arr = MOCK_RUNS;
    if (query.trim())
      arr = arr.filter((r) =>
        r.testName.toLowerCase().includes(query.toLowerCase()),
      );
    if (statusTab !== 'all') arr = arr.filter((r) => r.status === statusTab);
    if (envFilter !== 'all') arr = arr.filter((r) => r.envName === envFilter);
    if (tagFilter !== 'all')
      arr = arr.filter((r) => (r.tags ?? []).includes(tagFilter));
    if (resFilter !== 'all')
      arr = arr.filter((r) => (r.resolution ?? 'desktop') === resFilter);
    if (regionFilter !== 'all')
      arr = arr.filter((r) => r.region === regionFilter);
    return arr;
  }, [query, statusTab, envFilter, tagFilter, resFilter, regionFilter]);

  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + pageItems.length;

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
          {faded(MOCK_RUNS.length)}
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
      sorter: (a, b) => RESULT_ORDER[a.status] - RESULT_ORDER[b.status],
      showSorterTooltip: false,
      render: (status: RunStatus) => getRunResult(status, t),
    },
    {
      title: t('Test'),
      dataIndex: 'testName',
      sorter: (a, b) => a.testName.localeCompare(b.testName),
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
      sorter: (a, b) => (a.envName ?? '').localeCompare(b.envName ?? ''),
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
      sorter: (a, b) => (a.duration ?? Infinity) - (b.duration ?? Infinity),
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
      sorter: (a, b) => a.date - b.date,
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
            value={envFilter}
            onChange={setEnvFilter}
            style={{ width: 150 }}
            options={[
              { value: 'all', label: t('All environments') },
              ...ENV_NAMES.map((n) => ({ value: n, label: n })),
            ]}
          />
          <Select
            size="small"
            value={tagFilter}
            onChange={setTagFilter}
            style={{ width: 130 }}
            options={[
              { value: 'all', label: t('All tags') },
              ...TAG_NAMES.map((tag) => ({ value: tag, label: tag })),
            ]}
          />
          <Select
            size="small"
            value={resFilter}
            onChange={setResFilter}
            style={{ width: 140 }}
            options={[
              { value: 'all', label: t('All resolutions') },
              ...RESOLUTION_OPTIONS.map((o) => ({
                value: o.value,
                label: t(o.label),
              })),
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
        </div>
      </div>

      <Table<RunData>
        className="kai-table"
        rowKey="key"
        columns={columns}
        dataSource={pageItems}
        pagination={false}
        rowClassName="cursor-pointer"
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
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-disabled-text">
            {t('Showing')} {rangeStart}–{rangeEnd} {t('of')} {visible.length}{' '}
            {t('runs')}
          </span>
          <div className="w-[200px]">
            <Pagination
              page={page}
              total={visible.length}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      <RunDrawer
        run={openRun}
        open={!!openRun}
        onClose={() => setOpenKey(null)}
      />
    </div>
  );
}

export default RunsTab;
