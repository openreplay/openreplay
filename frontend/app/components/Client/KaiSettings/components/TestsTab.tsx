import { Button, Input, Select, Typography } from 'antd';
import { ChevronDown, ChevronUp, Radar, Search, Sparkles } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import TestCaseRow from './TestCaseContent';
import DraftDrawer from './drawers/DraftDrawer';
import TestDrawer from './drawers/TestDrawer';
import { MOCK_TEST_CASES } from './shared/mockData';
import { TestCase } from './shared/types';
import { TESTS_GRID, scheduleLabel } from './shared/utils';

type SortKey = 'name' | 'env' | 'schedule' | 'status';
const STATUS_ORDER: Record<string, number> = { active: 0, paused: 1, draft: 2 };

function TestsTab() {
  const { t } = useTranslation();
  const [tests, setTests] = useState<TestCase[]>(MOCK_TEST_CASES);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // the row currently opened in a drawer
  const [openKey, setOpenKey] = useState<string | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const updateTest = (updated: TestCase) =>
    setTests((prev) =>
      prev.map((tc) => (tc.key === updated.key ? updated : tc)),
    );
  const removeTest = (key: string) => {
    setTests((prev) => prev.filter((tc) => tc.key !== key));
    setOpenKey((k) => (k === key ? null : k));
  };
  const approveAll = () =>
    setTests((prev) =>
      prev.map((tc) =>
        tc.status === 'draft' ? { ...tc, status: 'active' } : tc,
      ),
    );
  const dismissAll = () =>
    setTests((prev) => prev.filter((tc) => tc.status !== 'draft'));

  // resolve fresh from `tests` so the drawer reflects live edits
  const openTest = tests.find((tc) => tc.key === openKey) ?? null;

  const draftCount = tests.filter((tc) => tc.status === 'draft').length;
  const activeCount = tests.filter((tc) => tc.status === 'active').length;
  const pausedCount = tests.filter((tc) => tc.status === 'paused').length;

  const envNames = Array.from(
    new Set(tests.map((tc) => tc.envName).filter(Boolean)),
  ) as string[];
  const allTags = Array.from(
    new Set(tests.flatMap((tc) => tc.tags ?? [])),
  ).sort();

  const compare = (a: TestCase, b: TestCase): number => {
    let r = 0;
    if (sortKey === 'name') r = a.title.localeCompare(b.title);
    else if (sortKey === 'env')
      r = (a.envName ?? '').localeCompare(b.envName ?? '');
    else if (sortKey === 'schedule')
      r = scheduleLabel(a.schedule).localeCompare(scheduleLabel(b.schedule));
    else if (sortKey === 'status')
      r = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return sortDir === 'asc' ? r : -r;
  };

  const visible = useMemo(() => {
    let arr = tests;
    if (query.trim())
      arr = arr.filter((tc) =>
        tc.title.toLowerCase().includes(query.toLowerCase()),
      );
    if (statusFilter !== 'all')
      arr = arr.filter((tc) => tc.status === statusFilter);
    if (envFilter !== 'all') arr = arr.filter((tc) => tc.envName === envFilter);
    if (tagFilter !== 'all')
      arr = arr.filter((tc) => (tc.tags ?? []).includes(tagFilter));

    // drafts always float to the top — they need a decision
    const drafts = arr.filter((tc) => tc.status === 'draft');
    const rest = arr.filter((tc) => tc.status !== 'draft');
    if (sortKey) rest.sort(compare);
    return [...drafts, ...rest];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests, query, statusFilter, envFilter, tagFilter, sortKey, sortDir]);

  // first-run / empty state
  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-16 px-4">
        <div className="w-12 h-12 rounded-full bg-tealx-lightest flex items-center justify-center">
          <Radar size={22} className="text-tealx" />
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
    <div className="flex flex-col gap-4 p-4">
      {/* agent drafts notice + bulk actions */}
      {draftCount > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap rounded-lg bg-tealx-lightest px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles size={15} className="text-tealx" />
            <span className="font-medium">
              {draftCount} {t('new drafts')}
            </span>
            <span className="text-disabled-text">{t('ready to review')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="small" onClick={approveAll}>
              {t('Approve all')}
            </Button>
            <Button size="small" onClick={dismissAll}>
              {t('Dismiss all')}
            </Button>
          </div>
        </div>
      )}

      {/* count summary — test-centric, no run history */}
      <div className="flex items-center gap-3 text-sm">
        <Typography.Text strong>
          {tests.length} {t('tests')}
        </Typography.Text>
        <span className="text-disabled-text">
          {activeCount} {t('active')}
        </span>
        {pausedCount > 0 && (
          <span className="text-disabled-text">
            {pausedCount} {t('paused')}
          </span>
        )}
        {draftCount > 0 && (
          <span className="text-tealx">
            {draftCount} {t('drafts')}
          </span>
        )}
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          size="small"
          allowClear
          prefix={<Search size={14} className="text-disabled-text" />}
          placeholder={t('Search tests')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: 200 }}
        />
        <Select
          size="small"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 130 }}
          options={[
            { value: 'all', label: t('All statuses') },
            { value: 'draft', label: t('Drafts') },
            { value: 'active', label: t('Active') },
            { value: 'paused', label: t('Paused') },
          ]}
        />
        <Select
          size="small"
          value={envFilter}
          onChange={setEnvFilter}
          style={{ width: 150 }}
          options={[
            { value: 'all', label: t('All environments') },
            ...envNames.map((n) => ({ value: n, label: n })),
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

      {visible.length === 0 ? (
        <Typography.Text type="secondary" className="text-sm!">
          {t('No tests match these filters.')}
        </Typography.Text>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* column header */}
          <div
            className={`${TESTS_GRID} px-4 py-2 bg-gray-lightest border-b text-xs font-medium text-disabled-text`}
          >
            <SortHeader label={t('Test')} k="name" />
            <span className="uppercase tracking-wide">{t('Tags')}</span>
            <SortHeader label={t('Environment')} k="env" />
            <SortHeader label={t('Schedule')} k="schedule" />
            <SortHeader label={t('Status')} k="status" />
            <span />
          </div>
          {visible.map((tc) => (
            <TestCaseRow
              key={tc.key}
              test={tc}
              onOpen={() => setOpenKey(tc.key)}
              onChange={updateTest}
              onRemove={removeTest}
            />
          ))}
        </div>
      )}

      {/* one drawer instance; draft vs test is decided by the opened row's status */}
      <DraftDrawer
        test={openTest?.status === 'draft' ? openTest : null}
        open={openTest?.status === 'draft'}
        onClose={() => setOpenKey(null)}
        onChange={updateTest}
        onRemove={removeTest}
      />
      <TestDrawer
        test={openTest && openTest.status !== 'draft' ? openTest : null}
        open={!!openTest && openTest.status !== 'draft'}
        onClose={() => setOpenKey(null)}
        onChange={updateTest}
        onRemove={removeTest}
      />
    </div>
  );
}

export default TestsTab;
