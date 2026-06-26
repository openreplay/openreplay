import {
  Badge,
  Button,
  Dropdown,
  Input,
  Segmented,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { Calendar, EllipsisVertical, Play, Radar } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import DraftDrawer from './drawers/DraftDrawer';
import TestDrawer from './drawers/TestDrawer';
import { MOCK_TEST_CASES } from './shared/mockData';
import { TestCase, TestLifecycle } from './shared/types';
import {
  getStatusTag,
  isScheduled,
  scheduleLabel,
  scheduleShort,
} from './shared/utils';
import './kai-table.css';

type StatusTab = 'all' | TestLifecycle;
const STATUS_ORDER: Record<string, number> = { draft: 0, active: 1, paused: 2 };

// Compact tag chips for a table cell (2 shown, rest folded into +N).
function RowTags({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0)
    return <span className="text-disabled-text">—</span>;
  const shown = tags.slice(0, 2);
  const rest = tags.slice(2);
  return (
    <div className="flex items-center gap-1 overflow-hidden">
      {shown.map((tag) => (
        <span
          key={tag}
          className="text-xs px-2 py-0.5 rounded border whitespace-nowrap bg-gray-lightest text-gray-dark"
          style={{ borderColor: 'var(--color-gray-light)' }}
        >
          {tag}
        </span>
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.join(', ')}>
          <span className="text-xs text-gray-medium shrink-0 cursor-default">
            +{rest.length}
          </span>
        </Tooltip>
      )}
    </div>
  );
}

function TestsTab() {
  const { t } = useTranslation();
  const [tests, setTests] = useState<TestCase[]>(MOCK_TEST_CASES);
  const [query, setQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const updateTest = (updated: TestCase) =>
    setTests((prev) => prev.map((tc) => (tc.key === updated.key ? updated : tc)));
  const removeMany = (keys: React.Key[]) => {
    const set = new Set(keys);
    setTests((prev) => prev.filter((tc) => !set.has(tc.key)));
    setSelectedKeys((prev) => prev.filter((k) => !set.has(k)));
    setOpenKey((k) => (k && set.has(k) ? null : k));
  };
  const removeTest = (key: string) => removeMany([key]);

  // open a row's drawer; opening a new draft marks it seen (clears the dot)
  const openRow = (tc: TestCase) => {
    setOpenKey(tc.key);
    if (tc.status === 'draft' && tc.isNew)
      updateTest({ ...tc, isNew: false });
  };

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

  const visible = useMemo(() => {
    let arr = tests;
    if (query.trim())
      arr = arr.filter((tc) =>
        tc.title.toLowerCase().includes(query.toLowerCase()),
      );
    if (statusTab !== 'all') arr = arr.filter((tc) => tc.status === statusTab);
    if (envFilter !== 'all') arr = arr.filter((tc) => tc.envName === envFilter);
    if (tagFilter !== 'all')
      arr = arr.filter((tc) => (tc.tags ?? []).includes(tagFilter));
    // drafts float to the top by default; column sort overrides this on click
    const drafts = arr.filter((tc) => tc.status === 'draft');
    const rest = arr.filter((tc) => tc.status !== 'draft');
    return [...drafts, ...rest];
  }, [tests, query, statusTab, envFilter, tagFilter]);

  // ---- bulk actions over the current selection -------------------------
  const selected = tests.filter((tc) => selectedKeys.includes(tc.key));
  const hasDrafts = selected.some((tc) => tc.status === 'draft');
  const hasActive = selected.some((tc) => tc.status === 'active');
  const hasPaused = selected.some((tc) => tc.status === 'paused');

  const bulkSet = (predicate: (tc: TestCase) => boolean, patch: Partial<TestCase>) => {
    setTests((prev) =>
      prev.map((tc) =>
        selectedKeys.includes(tc.key) && predicate(tc) ? { ...tc, ...patch } : tc,
      ),
    );
    setSelectedKeys([]);
  };
  const approveSelected = () => {
    bulkSet((tc) => tc.status === 'draft', { status: 'active', isNew: false });
    message.success(t('Drafts approved'));
  };
  const pauseSelected = () =>
    bulkSet((tc) => tc.status === 'active', { status: 'paused' });
  const resumeSelected = () =>
    bulkSet((tc) => tc.status === 'paused', { status: 'active' });
  const deleteSelected = () => removeMany(selectedKeys);

  const runNow = (tc: TestCase) =>
    message.success(`${tc.title} — ${t('run started, see Runs')}`);

  const faded = (n: number) => (
    <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>
  );
  const statusOptions = [
    { value: 'all', label: <span>{t('All')}{faded(tests.length)}</span> },
    { value: 'draft', label: <span>{t('Drafts')}{faded(draftCount)}</span> },
    { value: 'active', label: <span>{t('Active')}{faded(activeCount)}</span> },
    { value: 'paused', label: <span>{t('Paused')}{faded(pausedCount)}</span> },
  ];

  const rowMenu = (tc: TestCase) => {
    const items =
      tc.status === 'draft'
        ? [
            { key: 'open', label: t('Review draft') },
            { type: 'divider' as const },
            { key: 'dismiss', label: t('Dismiss'), danger: true },
          ]
        : [
            tc.status === 'active'
              ? { key: 'pause', label: t('Pause') }
              : { key: 'resume', label: t('Resume') },
            { key: 'open', label: t('Settings') },
            { type: 'divider' as const },
            { key: 'delete', label: t('Delete'), danger: true },
          ];
    return {
      items,
      onClick: ({ key, domEvent }: { key: string; domEvent: any }) => {
        domEvent.stopPropagation();
        if (key === 'open') openRow(tc);
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
      dataIndex: 'envName',
      width: 140,
      sorter: (a, b) => (a.envName ?? '').localeCompare(b.envName ?? ''),
      showSorterTooltip: false,
      render: (env?: string) =>
        env ? (
          <span className="text-gray-dark">{env}</span>
        ) : (
          <span className="text-disabled-text italic">{t('Not set')}</span>
        ),
    },
    {
      title: t('Schedule'),
      dataIndex: 'schedule',
      width: 180,
      sorter: (a, b) =>
        scheduleLabel(a.schedule).localeCompare(scheduleLabel(b.schedule)),
      showSorterTooltip: false,
      render: (_: unknown, tc) =>
        tc.status === 'draft' ? (
          <span className="text-disabled-text">—</span>
        ) : (
          <Tooltip title={scheduleLabel(tc.schedule)}>
            <span className="flex items-center gap-1.5 text-gray-dark">
              {isScheduled(tc.schedule) && (
                <Calendar size={13} className="shrink-0 text-gray-medium" />
              )}
              <span className="truncate">{scheduleShort(tc.schedule)}</span>
            </span>
          </Tooltip>
        ),
    },
    {
      title: t('Status'),
      dataIndex: 'status',
      width: 110,
      sorter: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
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
          <Dropdown trigger={['click']} placement="bottomRight" menu={rowMenu(tc)}>
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
        </div>
      </div>

      {/* bulk-action bar — appears only when rows are selected */}
      {selectedKeys.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-active-blue text-sm flex-wrap">
          <span className="font-medium">
            {selectedKeys.length} {t('selected')}
          </span>
          {hasDrafts && (
            <Button size="small" onClick={approveSelected}>
              {t('Approve')}
            </Button>
          )}
          {hasActive && (
            <Button size="small" onClick={pauseSelected}>
              {t('Pause')}
            </Button>
          )}
          {hasPaused && (
            <Button size="small" onClick={resumeSelected}>
              {t('Resume')}
            </Button>
          )}
          <Button size="small" danger onClick={deleteSelected}>
            {t('Delete')}
          </Button>
          <Button
            size="small"
            type="text"
            onClick={() => setSelectedKeys([])}
          >
            {t('Clear')}
          </Button>
        </div>
      )}

      <Table<TestCase>
        className="kai-table"
        rowKey="key"
        columns={columns}
        dataSource={visible}
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

      <div className="px-4 py-3 text-xs text-disabled-text">
        {t('Showing')} {visible.length} {t('of')} {tests.length} {t('tests')}
      </div>

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
