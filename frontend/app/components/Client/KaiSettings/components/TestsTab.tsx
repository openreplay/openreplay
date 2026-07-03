import {
  Badge,
  Button,
  Dropdown,
  Input,
  Segmented,
  Select,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { Calendar, EllipsisVertical, Play, Plus, Radar } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Pagination } from 'UI';

import DraftDrawer from './drawers/DraftDrawer';
import TestDrawer from './drawers/TestDrawer';
import './kai-table.css';
import { needsReview } from './shared/revisions';
import { hasNoEnvironment, kaiStore, useKaiStore } from './shared/store';
import { RunData, TestCase } from './shared/types';
import {
  DisplayStatus,
  RowTags,
  VersionLabel,
  displayStatus,
  getStatusTag,
  isScheduled,
  scheduleLabel,
  scheduleShort,
} from './shared/utils';

type StatusTab = 'all' | DisplayStatus;
const STATUS_ORDER: Record<string, number> = {
  draft: 0,
  needs_review: 1,
  approved: 2,
  active: 3,
  paused: 4,
};

let manualCounter = 0;

function TestsTab() {
  const { t } = useTranslation();
  // tests live in the shared store — Settings (environment deletion) mutates them too
  const { tests } = useKaiStore();
  const { setTests } = kaiStore;
  const [query, setQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [page, setPage] = useState(1);
  const [openKey, setOpenKey] = useState<string | null>(null);
  // when a drawer is opened via the "Schedule" action, jump straight to the schedule
  const [focusSchedule, setFocusSchedule] = useState(false);
  // the open drawer belongs to a just-added test: creation mode (footer "Create test");
  // closing without creating discards the placeholder
  const [creating, setCreating] = useState(false);

  const PAGE_SIZE = 20;
  useEffect(() => {
    setPage(1);
  }, [query, statusTab, envFilter, tagFilter]);

  // the Needs review tab only exists while something needs review — reviewing the
  // last one from inside that tab falls back to All instead of an empty filter
  const anyReview = tests.some((tc) => needsReview(tc));
  useEffect(() => {
    if (statusTab === 'needs_review' && !anyReview) setStatusTab('all');
  }, [statusTab, anyReview]);

  const updateTest = (updated: TestCase) =>
    setTests((prev) =>
      prev.map((tc) => (tc.key === updated.key ? updated : tc)),
    );
  const removeMany = (keys: React.Key[]) => {
    const set = new Set(keys);
    setTests((prev) => prev.filter((tc) => !set.has(tc.key)));
    setSelectedKeys((prev) => prev.filter((k) => !set.has(k)));
    setOpenKey((k) => (k && set.has(k) ? null : k));
  };
  const removeTest = (key: string) => removeMany([key]);

  // open a row's drawer; opening a new draft marks it seen (clears the dot)
  const openRow = (tc: TestCase) => {
    setFocusSchedule(false);
    setCreating(false);
    setOpenKey(tc.key);
    if (tc.status === 'draft' && tc.isNew) updateTest({ ...tc, isNew: false });
  };
  // open the Settings drawer scrolled to the schedule (from the "Schedule" action)
  const openSchedule = (tc: TestCase) => {
    setOpenKey(tc.key);
    setFocusSchedule(true);
  };
  // drop the schedule → the test goes back to "approved" (ready, not scheduled)
  const unschedule = (tc: TestCase) =>
    updateTest({ ...tc, status: 'approved', schedule: null });

  // Manual creation — writing steps by hand is easy, so a hand-made test skips the
  // draft/approve flow and starts life `approved` (ready, unscheduled), drawer open.
  const addTest = () => {
    // manual tests start from Settings' default run configuration, like drafts
    const { defaults } = kaiStore.get();
    const tc: TestCase = {
      key: `test-manual-${(manualCounter += 1)}-${Date.now()}`,
      title: t('Untitled test'),
      steps: [],
      status: 'approved',
      schedule: null,
      tags: [],
      envNames: defaults.envName ? [defaults.envName] : undefined,
      resolutions: defaults.resolution ? [defaults.resolution] : undefined,
      regions: defaults.region ? [defaults.region] : undefined,
    };
    setTests((prev) => [tc, ...prev]);
    setFocusSchedule(false);
    setCreating(true);
    setOpenKey(tc.key);
  };

  // jump to the Runs tab pre-filtered to this test ("View all runs")
  const viewRuns = (tc: TestCase) => {
    setOpenKey(null);
    kaiStore.showRunsForTest(tc.title);
  };
  // jump to the Runs tab with one exact run's drawer open ("View" on last failed run)
  const viewRun = (run: RunData) => {
    setOpenKey(null);
    kaiStore.openRunInRunsTab(run);
  };

  // Duplicate (row ellipsis): copies the steps only — no environment, schedule or
  // tags travel with it — and lands as a draft at v1, floating to the top.
  const duplicateTest = (tc: TestCase) => {
    const copy: TestCase = {
      key: `test-copy-${(manualCounter += 1)}-${Date.now()}`,
      title: `${tc.title} (copy)`,
      steps: [...tc.steps],
      status: 'draft',
      isNew: true,
    };
    setTests((prev) => [copy, ...prev]);
    message.success(t('Duplicated as a draft'));
  };

  const openTest = tests.find((tc) => tc.key === openKey) ?? null;

  // counts follow the DISPLAY status — a test with a pending revision counts under
  // Needs review, not under its underlying lifecycle status
  const countOf = (s: DisplayStatus) =>
    tests.filter((tc) => displayStatus(tc) === s).length;
  const draftCount = countOf('draft');
  const reviewCount = countOf('needs_review');
  const approvedCount = countOf('approved');
  const activeCount = countOf('active');
  const pausedCount = countOf('paused');

  const envNames = Array.from(
    new Set(tests.flatMap((tc) => tc.envNames ?? [])),
  ).sort();
  const allTags = Array.from(
    new Set(tests.flatMap((tc) => tc.tags ?? [])),
  ).sort();

  const visible = useMemo(() => {
    let arr = tests;
    if (query.trim())
      arr = arr.filter((tc) =>
        tc.title.toLowerCase().includes(query.toLowerCase()),
      );
    if (statusTab !== 'all')
      arr = arr.filter((tc) => displayStatus(tc) === statusTab);
    if (envFilter !== 'all')
      arr = arr.filter((tc) => (tc.envNames ?? []).includes(envFilter));
    if (tagFilter !== 'all')
      arr = arr.filter((tc) => (tc.tags ?? []).includes(tagFilter));
    // needs-attention rows float to the top by default — drafts first, then tests
    // waiting on a revision review; column sort overrides this on click
    const drafts = arr.filter((tc) => tc.status === 'draft');
    const review = arr.filter((tc) => tc.status !== 'draft' && needsReview(tc));
    const rest = arr.filter((tc) => tc.status !== 'draft' && !needsReview(tc));
    return [...drafts, ...review, ...rest];
  }, [tests, query, statusTab, envFilter, tagFilter]);

  const pageItems = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + pageItems.length;

  // ---- bulk actions over the current selection -------------------------
  const selected = tests.filter((tc) => selectedKeys.includes(tc.key));
  const selDrafts = selected.filter((tc) => tc.status === 'draft').length;
  const selActive = selected.filter((tc) => tc.status === 'active').length;
  const selPaused = selected.filter(
    (tc) => tc.status === 'paused' && !hasNoEnvironment(tc),
  ).length;

  const bulkSet = (
    predicate: (tc: TestCase) => boolean,
    patch: Partial<TestCase>,
  ) => {
    setTests((prev) =>
      prev.map((tc) =>
        selectedKeys.includes(tc.key) && predicate(tc)
          ? { ...tc, ...patch }
          : tc,
      ),
    );
    setSelectedKeys([]);
  };
  // Bulk approve can't gather a schedule per test, so drafts land in `approved`
  // (ready, not scheduled) — the user schedules each from its drawer or the ellipsis.
  const approveSelected = () => {
    bulkSet((tc) => tc.status === 'draft', {
      status: 'approved',
      isNew: false,
    });
    message.success(t('Drafts approved'));
  };
  const pauseSelected = () =>
    bulkSet((tc) => tc.status === 'active', { status: 'paused' });
  // paused tests with no environment left can't resume — nothing to run against
  const resumeSelected = () =>
    bulkSet((tc) => tc.status === 'paused' && !hasNoEnvironment(tc), {
      status: 'active',
    });
  const deleteSelected = () => removeMany(selectedKeys);

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
    // only appears when something actually needs review — a permanently-empty tab
    // would read as one more thing to worry about
    ...(reviewCount > 0
      ? [
          {
            value: 'needs_review',
            label: (
              <span>
                {t('Needs review')}
                {faded(reviewCount)}
              </span>
            ),
          },
        ]
      : []),
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
    } else if (needsReview(tc)) {
      // a pending revision suspends the run controls — reviewing is the only way
      // forward, so the menu leads with it
      items = [
        { key: 'open', label: t('Review changes') },
        { key: 'duplicate', label: t('Duplicate') },
        { type: 'divider' as const },
        { key: 'delete', label: t('Delete'), danger: true },
      ];
    } else {
      // state-dependent run controls, then Settings, then Delete
      const controls: {
        key: string;
        label: React.ReactNode;
        disabled?: boolean;
      }[] = [];
      if (tc.status === 'active')
        controls.push({ key: 'pause', label: t('Pause') });
      if (tc.status === 'paused') {
        // no environment → nothing to run against; Resume unlocks once one is set
        const blocked = hasNoEnvironment(tc);
        controls.push({
          key: 'resume',
          disabled: blocked,
          label: blocked ? (
            <Tooltip
              title={t('Set an environment in this test’s settings to resume.')}
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
      items = [
        ...controls,
        { key: 'open', label: t('Settings') },
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
        else if (key === 'dismiss' || key === 'delete') removeTest(tc.key);
      },
    };
  };

  const columns: TableColumnsType<TestCase> = [
    {
      title: t('Test'),
      dataIndex: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title),
      showSorterTooltip: false,
      render: (title: string, tc) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{title}</span>
          <VersionLabel version={tc.version} />
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
      sorter: (a, b) =>
        (a.envNames?.[0] ?? '').localeCompare(b.envNames?.[0] ?? ''),
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
      sorter: (a, b) =>
        scheduleLabel(a.schedule).localeCompare(scheduleLabel(b.schedule)),
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
      sorter: (a, b) =>
        STATUS_ORDER[displayStatus(a)] - STATUS_ORDER[displayStatus(b)],
      showSorterTooltip: false,
      render: (_: unknown, tc) => getStatusTag(displayStatus(tc), t),
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
                needsReview(tc)
                  ? t('Paused until the new version is reviewed')
                  : t('Run now')
              }
            >
              <Button
                type="text"
                disabled={needsReview(tc)}
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
        {/* selecting rows swaps the filters out for bulk actions — same row, no
            extra banner; each button carries the count it will affect */}
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
            {/* manual creation — the agent drafts most tests, but writing steps by
                hand is easy enough to deserve a first-class button */}
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
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-disabled-text">
            {t('Showing')} {rangeStart}–{rangeEnd} {t('of')} {visible.length}{' '}
            {t('tests')}
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
        focusSchedule={focusSchedule}
        creating={creating}
        onCreate={() => {
          setCreating(false);
          setOpenKey(null);
          message.success(t('Test created'));
        }}
        onViewRuns={viewRuns}
        onViewRun={viewRun}
        onClose={() => {
          // abandoning creation discards the placeholder test
          if (creating && openKey) removeTest(openKey);
          setCreating(false);
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
