import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable, type TableSort } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ActiveFilters } from '@/ui/filters/ActiveFilters';
import { type FilterDimension, FilterMenu } from '@/ui/filters/FilterMenu';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { DateRange } from '@/ui/inputs/DateRange';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import Period, {
  CUSTOM_RANGE,
  LAST_7_DAYS,
  LAST_24_HOURS,
  LAST_30_DAYS,
} from 'Types/app/period';
import {
  Globe,
  MonitorSmartphone,
  RotateCw,
  Server,
  Tag as TagIcon,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  RUNS_LIST_POLL_MS,
  RUNS_PENDING_POLL_MS,
  useAllRuns,
  useEnvironments,
  useRun,
  useRunCounts,
  useTriggerRun,
} from '../queries';
import { SyntheticsFrame } from './SyntheticsFrame';
import RunDrawer from './drawers/RunDrawer';
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
  REGION_OPTIONS,
  RESOLUTION_OPTIONS,
  RowTags,
  VersionLabel,
  formatDuration,
  getRunResult,
  regionLabel,
  resolutionLabel,
} from './shared/utils';
import './tests-page.css';

type StatusTab = 'all' | UiRunStatus;
type FilterKey = 'viewport' | 'tags' | 'env' | 'region';
const PAGE_SIZE = 20;
// column key → API sortField (only these two are server-sortable).
const SORT_FIELD: Record<string, ListAllRunsParams['sortField']> = {
  duration: 'duration_ms',
  when: 'started_at',
};
const NEWEST: TableSort = { key: 'when', desc: true };
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
const ALL_TIME = 'ALL_TIME';
const PERIODS = [
  { value: ALL_TIME, label: 'All time' },
  { value: LAST_24_HOURS, label: 'Past 24 Hours' },
  { value: LAST_7_DAYS, label: 'Past 7 Days' },
  { value: LAST_30_DAYS, label: 'Past 30 Days' },
  { value: CUSTOM_RANGE, label: 'Custom Range' },
];

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
  return <span className="m-runs__dur is-live">{label}</span>;
}

function RunsTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const triggerMut = useTriggerRun();
  const { data: envData } = useEnvironments({ limit: LOOKUP_LIMIT });
  const envNameById = useMemo(
    () => new Map((envData?.items ?? []).map((e) => [e.environmentId, e.name])),
    [envData],
  );

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
  const [period, setPeriod] = useState<any>(() =>
    Period({ rangeName: LAST_7_DAYS }),
  );
  const [sortBy, setSortBy] = useState<TableSort>(NEWEST);
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

  // the window is fixed when picked, so the query key stays stable between renders
  const allTime = period.rangeName === ALL_TIME;
  const custom = period.rangeName === CUSTOM_RANGE;
  const from = allTime ? undefined : new Date(period.start).toISOString();
  const to = custom ? new Date(period.end).toISOString() : undefined;
  const filters = {
    name: search || undefined,
    screenType: resFilter !== 'all' ? resFilter : undefined,
    tags: tagFilter !== 'all' ? tagFilter : undefined,
    environmentId: envFilter !== 'all' ? envFilter : undefined,
    region: regionFilter !== 'all' ? regionFilter : undefined,
    from,
    to,
  };

  const sortField = SORT_FIELD[sortBy.key];
  const listParams: ListAllRunsParams = {
    page,
    limit: PAGE_SIZE,
    ...filters,
    status:
      statusTab !== 'all' ? BUCKET_STATUSES[statusTab].join(',') : undefined,
    ...(sortField
      ? { sortField, sortOrder: sortBy.desc ? 'desc' : 'asc' }
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
    to,
  });
  const tagOptions = (tagCounts?.buckets ?? [])
    .map((b) => b.value)
    .filter(Boolean);

  // reset to page 1 whenever a filter changes (sort resets page in onSort)
  const filterKey = `${search}|${statusTab}|${resFilter}|${from}|${to}|${tagFilter}|${envFilter}|${regionFilter}`;
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
    sortBy.key === 'when' &&
    sortBy.desc;

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

  const columns: Column<RunData>[] = [
    {
      title: t('Result'),
      key: 'result',
      width: 116,
      render: (run) => getRunResult(run.status, t),
    },
    {
      title: t('Test'),
      key: 'test',
      render: (run) => (
        <div className="m-runs__title-cell">
          <span className="m-runs__title m-truncate">{run.testName}</span>
          <VersionLabel version={run.version ?? undefined} />
          {run.error && (
            <span className="m-runs__error m-truncate" title={run.error}>
              {run.error}
            </span>
          )}
        </div>
      ),
    },
    {
      title: t('Tags'),
      key: 'tags',
      width: 160,
      render: (run) => <RowTags tags={run.tags} />,
    },
    {
      title: t('Environment'),
      key: 'env',
      width: 140,
      // viewport and region ride on the hover; they are filters for the log anyway
      render: (run) =>
        run.envName ? (
          <Tooltip
            title={`${resolutionLabel(t, run.resolution)} · ${regionLabel(run.region)}`}
          >
            <span className="m-runs__where m-truncate">{run.envName}</span>
          </Tooltip>
        ) : (
          <span className="m-tests__unset">{t('Not set')}</span>
        ),
    },
    {
      title: t('Duration'),
      key: 'duration',
      width: 100,
      sortable: true,
      render: (run) =>
        run.status === 'running' ? (
          <LiveDuration start={run.date} />
        ) : (
          <span className="m-runs__dur">
            {run.duration ? formatDuration(run.duration) : '—'}
          </span>
        ),
    },
    {
      title: t('When'),
      key: 'when',
      width: 104,
      sortable: true,
      render: (run) => <RelativeTime at={run.date} />,
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      align: 'right',
      render: (run) =>
        run.status === 'running' ? null : (
          <IconButton
            icon={<RotateCw size={14} />}
            label={t('Rerun')}
            variant="ghost"
            onClick={() => rerun(run)}
          />
        ),
    },
  ];

  /* ── filters ── */
  const dimensions: FilterDimension<FilterKey>[] = [
    {
      key: 'env',
      label: t('Environment'),
      icon: <Server size={14} />,
      single: true,
      options: (envData?.items ?? []).map((e) => ({
        value: e.environmentId,
        label: e.name,
      })),
    },
    {
      key: 'tags',
      label: t('Tags'),
      icon: <TagIcon size={14} />,
      single: true,
      options: tagOptions.map((tag) => ({ value: tag, label: tag })),
    },
    {
      key: 'viewport',
      label: t('Viewport'),
      icon: <MonitorSmartphone size={14} />,
      single: true,
      options: RESOLUTION_OPTIONS.map((o) => ({
        value: o.value,
        label: t(o.label),
      })),
    },
    {
      key: 'region',
      label: t('Region'),
      icon: <Globe size={14} />,
      single: true,
      options: REGION_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    },
  ];
  const state: Record<FilterKey, [string, (v: string) => void]> = {
    env: [envFilter, setEnvFilter],
    tags: [tagFilter, setTagFilter],
    viewport: [resFilter, setResFilter],
    region: [regionFilter, setRegionFilter],
  };
  const isActive = (key: FilterKey, value: string) => state[key][0] === value;
  const onToggle = (key: FilterKey, value: string) => {
    const [cur, set] = state[key];
    set(cur === value ? 'all' : value);
  };
  const dimLabel: Record<FilterKey, string> = {
    env: t('Environment'),
    tags: t('Tag'),
    viewport: t('Viewport'),
    region: t('Region'),
  };
  const chips = (Object.keys(state) as FilterKey[])
    .filter((k) => state[k][0] !== 'all')
    .map((k) => ({
      key: k,
      value: state[k][0],
      dimension: dimLabel[k],
      label:
        dimensions
          .find((d) => d.key === k)
          ?.options.find((o) => o.value === state[k][0])?.label ?? state[k][0],
    }));
  const clearFilters = () => {
    (Object.keys(state) as FilterKey[]).forEach((k) => state[k][1]('all'));
    setQuery('');
    setPeriod(Period({ rangeName: LAST_7_DAYS }));
  };
  const filtered =
    chips.length > 0 || !!search || period.rangeName !== LAST_7_DAYS;

  const emptyTab: Record<StatusTab, string> = {
    all: t('No runs in this period'),
    running: t('Nothing is running right now'),
    failed: t('No failures in this period'),
    passed: t('No passes in this period'),
  };

  return (
    <SyntheticsFrame
      actions={
        <SearchField
          placeholder={t('Search runs')}
          value={query}
          onChange={setQuery}
        />
      }
      toolbar={
        <>
          <FilterStrip
            label={t('Filter by result')}
            items={[
              { key: 'all', label: t('All'), count: allCount },
              { key: 'running', label: t('Running'), count: runningCount },
              { key: 'failed', label: t('Failed'), count: failedCount },
              { key: 'passed', label: t('Passed'), count: passedCount },
            ]}
            selected={[statusTab]}
            onSelect={(key) => setStatusTab(key as StatusTab)}
          />
          <div className="m-page__controls">
            <DateRange
              field={t('Started')}
              period={period}
              options={PERIODS}
              resting={LAST_7_DAYS}
              onChange={setPeriod}
            />
            <FilterMenu<FilterKey>
              dimensions={dimensions}
              isActive={isActive}
              onToggle={onToggle}
              activeCount={chips.length}
              label={t('Filter runs')}
            />
          </div>
        </>
      }
    >
      <ActiveFilters<FilterKey>
        chips={chips}
        onRemove={onToggle}
        onClearAll={() =>
          (Object.keys(state) as FilterKey[]).forEach((k) => state[k][1]('all'))
        }
        resultCount={total}
        noun={[t('run'), t('runs')]}
      />
      {isPending || holdingForTrigger ? (
        <SkeletonRows rows={7} columns={[12, 40, 14, 16, 8, 8]} />
      ) : runs.length === 0 ? (
        allCount === 0 && !filtered ? (
          <EmptyState
            art="tests"
            title={t('Nothing has run yet')}
            hint={t(
              'Approve a test and give it a schedule, and its runs land here — one row per environment, viewport and region it runs against.',
            )}
          />
        ) : filtered ? (
          <EmptyState
            art="search"
            title={t('No runs match these filters')}
            hint={t(
              'The period counts as a filter here — clear them to see the whole log.',
            )}
            action={
              <Button onClick={clearFilters}>{t('Clear filters')}</Button>
            }
          />
        ) : (
          <EmptyState
            title={emptyTab[statusTab]}
            hint={t(
              'Runs appear here as scheduled tests execute, and stay for as long as you keep them.',
            )}
          />
        )
      ) : (
        <>
          <DataTable<RunData>
            className="m-runs__table"
            ariaLabel={t('Runs')}
            columns={columns}
            rows={runs}
            rowKey={(r) => r.key}
            rowClassName={() => 'm-tests__row'}
            sort={sortBy}
            onSort={(key, desc) => {
              setSortBy(key ? { key, desc } : NEWEST);
              setPage(1);
            }}
            onRowClick={(run) => setOpenKey(run.key, true)}
          />
          <ListFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            noun={[t('run'), t('runs')]}
            onPage={setPage}
          />
        </>
      )}

      <RunDrawer
        run={openRun}
        open={!!openKey}
        onClose={() => setOpenKey(null)}
      />
    </SyntheticsFrame>
  );
}

export default RunsTab;
