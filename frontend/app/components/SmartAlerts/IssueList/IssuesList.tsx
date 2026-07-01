import withPageTitle from '@/components/hocs/withPageTitle';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Modal,
  Popover,
  Segmented,
  Select,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import {
  Album,
  ArrowUpRight,
  ChevronDown,
  Eye,
  EyeOff,
  Info,
  MoreVertical,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory } from 'App/routing';
import { smartIssueDetails, withSiteId } from 'App/saasComponents';

import SelectDateRange from 'Shared/SelectDateRange';

import type { SortDir, Visibility } from '../api';
import {
  CAT_COLOR,
  CAT_ICON,
  CAT_ORDER,
  type CategoryName,
  CriticalToggle,
  HideIssueModal,
  ImpactGauge,
  type Issue,
  RenameIssueModal,
  TagChip,
  impactLevel,
  lastSeenExact,
  lastSeenLabel,
} from '../shared';
import type { SortMode } from '../shared/model';
import TagFilter from './TagFilter';

/* antd header-sort order -> our SortMode, per sortable column. */
const SORT_FIELD: Record<string, SortMode> = {
  impact: 'impact',
  seenAgoMin: 'recency',
};
const antOrder = (dir: SortDir): 'ascend' | 'descend' =>
  dir === 'asc' ? 'ascend' : 'descend';

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'all', label: 'All' },
];

function IssuesList() {
  const { issuesStore, projectsStore } = useStore();
  const { t } = useTranslation();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();

  const [dispOpen, setDispOpen] = React.useState(false);
  const [hideTarget, setHideTarget] = React.useState<Issue | null>(null);
  const [renameTarget, setRenameTarget] = React.useState<Issue | null>(null);
  const [period, setPeriod] = React.useState<any>(
    Period({ rangeName: LAST_7_DAYS }),
  );

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);

  const openDetail = (id: string) =>
    history.push(withSiteId(smartIssueDetails(encodeURIComponent(id)), siteId));

  const onPeriodChange = (p: any) => {
    setPeriod(p);
    issuesStore.setRange([p.start, p.end]);
  };

  const showCategory = issuesStore.hasCategories;
  const showLastSeen = issuesStore.list.some((i) => i.seenAgoMin != null);
  const { visibility } = issuesStore;

  const catValue: 'All' | CategoryName =
    issuesStore.cats.length === 1 ? issuesStore.cats[0] : 'All';
  const catTabOptions = [
    { value: 'All', label: t('All') },
    ...CAT_ORDER.map((c) => {
      const Ic = CAT_ICON[c];
      return {
        value: c,
        icon: (
          <Ic
            size={14}
            strokeWidth={2}
            style={{ color: c === catValue ? CAT_COLOR[c] : undefined }}
          />
        ),
        label: t(c),
      };
    }),
  ];

  const columns: TableColumnsType<Issue> = [
    {
      title: t('Impact'),
      dataIndex: 'impact',
      width: 96,
      sorter: true,
      sortOrder:
        issuesStore.sort === 'impact' ? antOrder(issuesStore.sortDir) : null,
      showSorterTooltip: false,
      render: (v: number) => {
        const title = t('{{level}} impact', { level: t(impactLevel(v)) });
        return (
          <Tooltip title={title}>
            <span
              className="inline-flex items-center"
              role="img"
              aria-label={title}
            >
              <ImpactGauge value={v} />
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: t('Issue'),
      dataIndex: 'head',
      render: (head: string, r: Issue) => (
        <div className="flex items-center gap-2 min-w-0">
          <CriticalToggle
            critical={r.critical}
            reasons={issuesStore.reasons.criticality}
            stopPropagation
            onSet={(val, reasons, note) =>
              issuesStore.setCritical(r.id, val, reasons, note)
            }
          />
          <span className="truncate font-medium color-gray-darkest">
            {head}
          </span>
          {issuesStore.viewingHidden && (
            <Tooltip title={t('Hidden')}>
              <Tag className="rounded">{t('Hidden')}</Tag>
            </Tooltip>
          )}
          {issuesStore.viewingDeleted && (
            <Tooltip title={t('Deleted')}>
              <Tag color="red" className="rounded">
                {t('Deleted')}
              </Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: t('Tags'),
      dataIndex: 'journeyLabels',
      width: 260,
      render: (labels: string[]) => {
        if (!labels?.length) return null;
        const shown = labels.slice(0, 2);
        const rest = labels.length - shown.length;
        return (
          <Tooltip title={rest > 0 ? labels.join(' · ') : undefined}>
            <div className="flex items-center gap-1.5 overflow-hidden">
              {shown.map((t) => (
                <TagChip key={t} label={t} />
              ))}
              {rest > 0 && (
                <span className="text-xs color-gray-medium shrink-0">
                  +{rest}
                </span>
              )}
            </div>
          </Tooltip>
        );
      },
    },
    ...(showLastSeen
      ? ([
          {
            title: t('Last seen'),
            dataIndex: 'seenAgoMin',
            width: 156,
            sorter: true,
            sortOrder:
              issuesStore.sort === 'recency'
                ? antOrder(issuesStore.sortDir)
                : null,
            showSorterTooltip: false,
            render: (m?: number) =>
              m == null ? null : (
                <Tooltip title={lastSeenExact(m)}>
                  <span className="text-sm tabular-nums color-gray-medium">
                    {lastSeenLabel(m)}
                  </span>
                </Tooltip>
              ),
          },
        ] as TableColumnsType<Issue>)
      : []),
    {
      title: '',
      dataIndex: 'actions',
      width: 48,
      align: 'center',
      render: (_: unknown, r: Issue) => {
        const items = [
          {
            key: 'detail',
            icon: <ArrowUpRight size={14} />,
            label: t('Open'),
          },
          { key: 'rename', icon: <Pencil size={14} />, label: t('Rename') },
          { type: 'divider' as const },
          ...(visibility === 'deleted'
            ? [
                {
                  key: 'restore',
                  icon: <RotateCcw size={14} />,
                  label: t('Restore'),
                },
              ]
            : [
                visibility === 'hidden'
                  ? {
                      key: 'unhide',
                      icon: <Eye size={14} />,
                      label: t('Unhide'),
                    }
                  : {
                      key: 'hide',
                      icon: <EyeOff size={14} />,
                      label: t('Hide'),
                    },
                {
                  key: 'delete',
                  icon: <Trash2 size={14} />,
                  label: t('Delete'),
                  danger: true,
                },
              ]),
        ];
        return (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            menu={{
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                if (key === 'detail') openDetail(r.id);
                else if (key === 'rename') setRenameTarget(r);
                else if (key === 'hide') setHideTarget(r);
                else if (key === 'unhide') issuesStore.unhide(r.id);
                else if (key === 'restore') issuesStore.restore(r.id);
                else if (key === 'delete') confirmDelete(r);
              },
              items,
            }}
          >
            <Button
              type="text"
              size="small"
              className="flex items-center justify-center"
              aria-label={t('Issue actions')}
              icon={<MoreVertical size={16} />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];

  const confirmDelete = (r: Issue) =>
    Modal.confirm({
      title: t('Delete this issue?'),
      content: t(
        '“{{head}}” will be removed. You can restore it later from the Deleted view.',
        { head: r.head },
      ),
      okText: t('Delete'),
      okButtonProps: { danger: true },
      onOk: () => issuesStore.remove(r.id),
    });

  const onTableChange = (
    _pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: SorterResult<Issue> | SorterResult<Issue>[],
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const field = SORT_FIELD[String(s?.field ?? '')];
    // pagination changes also fire onChange with the sorter unchanged — the
    // setter no-ops when nothing changed, and page is handled by pagination.onChange.
    if (field && s?.order) {
      issuesStore.setSortState(field, s.order === 'ascend' ? 'asc' : 'desc');
    }
  };

  const dispCount = issuesStore.critOnly ? 1 : 0;

  const displayContent = (
    <div className="flex flex-col gap-3 p-1" style={{ minWidth: 190 }}>
      <Checkbox
        checked={issuesStore.critOnly}
        onChange={(e) => issuesStore.setCritOnly(e.target.checked)}
      >
        {t('Critical only')}
      </Checkbox>
      <div className="flex flex-col gap-1">
        <span className="text-xs color-gray-medium">{t('Show')}</span>
        <Select
          size="small"
          value={visibility}
          onChange={(v) => issuesStore.setVisibility(v as Visibility)}
          options={VISIBILITY_OPTIONS.map((o) => ({
            value: o.value,
            label: t(o.label),
          }))}
        />
      </div>
    </div>
  );

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">{t('Issues')}</span>
          <Tag
            color="#394DFE"
            className="rounded"
            style={{ fontSize: 10, fontWeight: 700, lineHeight: '16px' }}
          >
            {t('BETA')}
          </Tag>
          <Tooltip
            placement="bottom"
            title={t(
              'Issues our agents found while reviewing session replays for this project, ranked by impact. Open one to read the journey and jump straight to the moment it happened.',
            )}
          >
            <span className="flex items-center cursor-help color-gray-medium">
              <Info size={15} />
            </span>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://docs.openreplay.com/"
            target="_blank"
            rel="noreferrer"
          >
            <Button type="text" icon={<Album size={14} />}>
              {t('Docs')}
            </Button>
          </a>
          <div className="min-w-50 md:w-1/4 md:min-w-75">
            <Input.Search
              size="small"
              allowClear
              maxLength={256}
              placeholder={t('Filter by issue name')}
              value={issuesStore.query}
              onChange={(e) => issuesStore.setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-wrap">
        {showCategory ? (
          <Segmented
            size="small"
            value={catValue}
            onChange={(v) =>
              issuesStore.setCats(v === 'All' ? [] : [v as CategoryName])
            }
            options={catTabOptions}
          />
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <TagFilter
            allTags={issuesStore.allTags}
            labels={issuesStore.labels}
            match={issuesStore.match}
            onToggle={issuesStore.toggleLabel}
            onSetMatch={issuesStore.setMatch}
            onClear={() => issuesStore.setLabels([])}
          />

          <Popover
            open={dispOpen}
            onOpenChange={setDispOpen}
            trigger="click"
            placement="bottomRight"
            content={displayContent}
          >
            <Button size="small" icon={<SlidersHorizontal size={14} />}>
              {t('Display')}
              {dispCount ? ` (${dispCount})` : ''}
              <ChevronDown size={13} className="ml-0.5 opacity-60" />
            </Button>
          </Popover>

          <SelectDateRange
            isAnt
            right
            useButtonStyle
            period={period}
            onChange={onPeriodChange}
          />
        </div>
      </div>

      <Table<Issue>
        className="[&_.ant-table-tbody>tr>td]:!py-0 [&_.ant-table-tbody>tr>td]:h-[55px]"
        rowKey="id"
        columns={columns}
        dataSource={issuesStore.list}
        loading={issuesStore.loading}
        onChange={onTableChange}
        pagination={{
          current: issuesStore.page,
          pageSize: issuesStore.limit,
          total: issuesStore.total,
          showSizeChanger: false,
          hideOnSinglePage: true,
          onChange: (p) => issuesStore.setPage(p),
        }}
        rowClassName={() =>
          `cursor-pointer${visibility !== 'active' ? ' opacity-60' : ''}`
        }
        onRow={(r) => ({ onClick: () => openDetail(r.id) })}
        locale={{ emptyText: t('No issues match these filters.') }}
      />

      <div className="px-4 py-3 text-xs color-gray-medium">
        {t('Showing {{shown}} of {{total}} issues', {
          shown: issuesStore.list.length,
          total: issuesStore.total,
        })}
      </div>

      <HideIssueModal
        open={hideTarget != null}
        head={hideTarget?.head}
        reasons={issuesStore.reasons.hide}
        onCancel={() => setHideTarget(null)}
        onConfirm={(reasons, note) => {
          if (hideTarget) issuesStore.hide(hideTarget.id, reasons, note);
          setHideTarget(null);
        }}
      />

      <RenameIssueModal
        open={renameTarget != null}
        initial={renameTarget?.head ?? ''}
        onCancel={() => setRenameTarget(null)}
        onConfirm={(name) => {
          if (renameTarget) issuesStore.rename(renameTarget.id, name);
          setRenameTarget(null);
        }}
      />
    </div>
  );
}

export default withPageTitle('Smart Issues')(observer(IssuesList));
