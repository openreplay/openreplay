import { Input, Select, Switch, Tooltip } from 'antd';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import RunRow from './RunRow';
import RunDrawer from './drawers/RunDrawer';
import { MOCK_RUNS } from './shared/mockData';
import { RunData } from './shared/types';
import { RUNS_GRID, isToday, relativeTime } from './shared/utils';

const ENV_NAMES = Array.from(
  new Set(MOCK_RUNS.map((r) => r.envName).filter(Boolean)),
) as string[];
const TAG_NAMES = Array.from(
  new Set(MOCK_RUNS.flatMap((r) => r.tags ?? [])),
).sort();

type SortKey = 'result' | 'test' | 'env' | 'duration' | 'when';
const RESULT_ORDER: Record<string, number> = {
  running: 0,
  failed: 1,
  passed: 2,
};

function RunsTab() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [showFailedOnly, setShowFailedOnly] = useState(false);
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('when');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const openRun = MOCK_RUNS.find((r) => r.key === openKey) ?? null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'when' ? 'desc' : 'asc');
    }
  };

  const filteredRuns = MOCK_RUNS.filter((run) => {
    if (
      query.trim() &&
      !run.testName.toLowerCase().includes(query.toLowerCase())
    )
      return false;
    if (showFailedOnly && run.status !== 'failed') return false;
    if (envFilter !== 'all' && run.envName !== envFilter) return false;
    if (tagFilter !== 'all' && !(run.tags ?? []).includes(tagFilter))
      return false;
    return true;
  });

  const sortedRuns = useMemo(() => {
    const arr = [...filteredRuns];
    arr.sort((a, b) => {
      let r = 0;
      if (sortKey === 'result')
        r = RESULT_ORDER[a.status] - RESULT_ORDER[b.status];
      else if (sortKey === 'test') r = a.testName.localeCompare(b.testName);
      else if (sortKey === 'env')
        r = (a.envName ?? '').localeCompare(b.envName ?? '');
      else if (sortKey === 'duration')
        r = (a.duration ?? Infinity) - (b.duration ?? Infinity);
      else r = a.date - b.date; // when
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRuns, sortKey, sortDir]);

  // recent-runs pulse — last 14 runs (respecting filters), oldest → newest
  const pulse = useMemo(
    () => [...filteredRuns].sort((a, b) => b.date - a.date).slice(0, 14).reverse(),
    [filteredRuns],
  );

  const dotColor = (s: RunData['status']) =>
    s === 'passed' ? 'bg-green' : s === 'failed' ? 'bg-red' : 'bg-indigo';

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 text-left uppercase tracking-wide hover:text-black"
    >
      {label}
      {sortKey === k &&
        (sortDir === 'asc' ? (
          <ChevronUp size={12} />
        ) : (
          <ChevronDown size={12} />
        ))}
    </button>
  );

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-disabled-text">
          {t('Showing')} {filteredRuns.length} {t('of')} {MOCK_RUNS.length}{' '}
          {t('runs')} · {t('run in the cloud')}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            size="small"
            allowClear
            prefix={<Search size={14} className="text-disabled-text" />}
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
          <div className="flex items-center gap-2">
            <Switch
              checked={showFailedOnly}
              onChange={setShowFailedOnly}
              size="small"
            />
            <span className="text-sm">{t('Show failed only')}</span>
          </div>
        </div>
      </div>

      {/* recent-runs pulse */}
      {pulse.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-disabled-text">
            {t('Recent')}
          </span>
          <div className="flex items-center gap-1">
            {pulse.map((run) => (
              <Tooltip
                key={run.key}
                title={`${run.testName} · ${run.status} · ${relativeTime(run.date)}`}
              >
                <button
                  type="button"
                  onClick={() => setOpenKey(run.key)}
                  aria-label={`${run.testName} ${run.status}`}
                  className={`w-2.5 h-2.5 rounded-full ${dotColor(run.status)} ${
                    run.status === 'running' ? 'animate-pulse' : ''
                  } hover:ring-2 hover:ring-active-blue-border transition`}
                />
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {filteredRuns.length === 0 ? (
        <div className="text-sm text-disabled-text">
          {t('No runs match these filters.')}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* column header */}
          <div
            className={`${RUNS_GRID} px-4 py-2 bg-gray-lightest border-b text-xs font-medium text-disabled-text`}
            style={{ borderLeft: '2px solid transparent' }}
          >
            <SortHeader label={t('Result')} k="result" />
            <SortHeader label={t('Test')} k="test" />
            <span className="uppercase tracking-wide">{t('Tags')}</span>
            <SortHeader label={t('Environment')} k="env" />
            <SortHeader label={t('Duration')} k="duration" />
            <SortHeader label={t('When')} k="when" />
            <span />
          </div>
          {sortedRuns.map((run) => (
            <RunRow
              key={run.key}
              run={run}
              today={isToday(run.date)}
              onOpen={() => setOpenKey(run.key)}
            />
          ))}
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
