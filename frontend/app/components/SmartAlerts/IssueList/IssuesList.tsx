import withPageTitle from '@/components/hocs/withPageTitle';
import withPermissions from '@/components/hocs/withPermissions';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Modal,
  Popover,
  Segmented,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { TableColumnsType, TablePaginationConfig } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import {
  Album,
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  Eye,
  EyeOff,
  Focus as FocusIcon,
  Globe,
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

import FullPagination from 'Shared/FullPagination';
import SelectDateRange from 'Shared/SelectDateRange';

import type { IssueOrigin, SortDir } from '../api';
import {
  CAT_COLOR,
  CAT_ICON,
  CAT_ORDER,
  type CategoryName,
  CriticalReasonPanel,
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
import FocusButton from './focus/FocusButton';

/* antd header-sort order -> our SortMode, per sortable column. */
const SORT_FIELD: Record<string, SortMode> = {
  impact: 'impact',
  seenAgoMin: 'recency',
};
const antOrder = (dir: SortDir): 'ascend' | 'descend' =>
  dir === 'asc' ? 'ascend' : 'descend';

function IssuesList() {
  const { issuesStore, projectsStore } = useStore();
  const { t } = useTranslation();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();

  const [dispOpen, setDispOpen] = React.useState(false);
  const [hideTarget, setHideTarget] = React.useState<Issue | null>(null);
  const [critTarget, setCritTarget] = React.useState<Issue | null>(null);
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
        issuesStore.sortTouched && issuesStore.sort === 'impact'
          ? antOrder(issuesStore.sortDir)
          : null,
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
      render: (head: string, r: Issue) => {
        // origin chip only makes sense once focuses exist (NOT-YET-BACKED)
        const focus = issuesStore.focusById(r.focusId);
        return (
          <div className="flex items-center gap-2 min-w-0">
            <CriticalToggle
              state={issuesStore.critState(r.id)}
              onMark={() => issuesStore.markMine(r.id)}
              onRemoveMine={() => issuesStore.removeMine(r.id)}
              stopPropagation
            />
            {issuesStore.focuses.length > 0 && (
              <Tooltip
                title={
                  focus
                    ? t('Found in focus: {{name}}', { name: focus.name })
                    : t('Found in full traffic')
                }
              >
                <span
                  className="inline-flex items-center shrink-0"
                  style={{
                    color: focus
                      ? 'var(--color-main)'
                      : 'var(--color-gray-medium)',
                  }}
                >
                  {focus ? <FocusIcon size={13} /> : <Globe size={13} />}
                </span>
              </Tooltip>
            )}
            <span className="truncate font-medium color-gray-darkest">
              {head}
            </span>
            {r.hidden && (
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
        );
      },
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
              issuesStore.sortTouched && issuesStore.sort === 'recency'
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
          // removing the project-wide (agent) flag lives here — the triangle
          // only cycles my personal layer
          ...(issuesStore.agentCritical(r.id)
            ? [
                {
                  key: 'notCritical',
                  icon: <AlertTriangle size={14} />,
                  label: t('Mark as not critical'),
                },
              ]
            : []),
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
                r.hidden
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
                else if (key === 'notCritical') setCritTarget(r);
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

  const dispCount =
    (issuesStore.critOnly ? 1 : 0) +
    (visibility === 'hidden' ? 1 : 0) +
    (issuesStore.relevantToMe ? 1 : 0);

  const displayContent = (
    <div className="flex flex-col gap-2 p-1" style={{ minWidth: 190 }}>
      <Checkbox
        checked={issuesStore.critOnly}
        onChange={(e) => issuesStore.setCritOnly(e.target.checked)}
      >
        {t('Critical only')}
      </Checkbox>
      <Checkbox
        checked={visibility === 'hidden'}
        onChange={(e) =>
          issuesStore.setVisibility(e.target.checked ? 'hidden' : 'active')
        }
      >
        {t('Hidden')}
      </Checkbox>
      {/* "what's mine": my criticals ∪ my segments' finds (Mehdi 07-07),
          labeled around critical per Gabriel 07-07 */}
      <Checkbox
        checked={issuesStore.relevantToMe}
        onChange={(e) => issuesStore.setRelevantToMe(e.target.checked)}
      >
        {t('Critical to me')}
        {issuesStore.relevantCount ? ` (${issuesStore.relevantCount})` : ''}
      </Checkbox>
    </div>
  );

  return (
    <div className="mx-auto w-full flex flex-col" style={{ maxWidth: 1360 }}>
      <div className="flex flex-col rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{t('Issues')}</span>
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
              focuses={issuesStore.focuses.map((f) => ({
                id: f.id,
                name: f.name,
                mine: f.mine,
              }))}
              origins={issuesStore.origins}
              onToggle={issuesStore.toggleLabel}
              onToggleOrigin={issuesStore.toggleOrigin}
              onSetMatch={issuesStore.setMatch}
              onClear={() => {
                issuesStore.setLabels([]);
                issuesStore.clearOrigins();
              }}
            />

            <FocusButton />

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
          pagination={false}
          rowClassName={(r) =>
            `cursor-pointer${r.hidden || visibility === 'deleted' ? ' opacity-60' : ''}`
          }
          onRow={(r) => ({ onClick: () => openDetail(r.id) })}
          locale={{
            emptyText:
              issuesStore.relevantToMe && issuesStore.total === 0
                ? t(
                    'Nothing relevant yet — mark issues critical for you, or create a traffic segment, and they’ll show up here.',
                  )
                : t('No issues match these filters.'),
          }}
        />
      </div>

      <FullPagination
        page={issuesStore.page}
        limit={issuesStore.limit}
        total={issuesStore.total}
        listLen={issuesStore.list.length}
        onPageChange={(p) => issuesStore.setPage(p)}
        entity={t('issues')}
      />

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

      {/* project-wide critical removal — teaching reason (the triangle only
          touches my personal layer) */}
      <Modal
        title={t('Mark as not critical')}
        open={critTarget != null}
        onCancel={() => setCritTarget(null)}
        footer={null}
        width={340}
      >
        {critTarget && (
          <div className="flex flex-col gap-3">
            <p className="color-gray-dark m-0">
              {t(
                '“{{head}}” will no longer be critical for anyone. Your reason helps the agent learn.',
                { head: critTarget.head },
              )}
            </p>
            <CriticalReasonPanel
              reasons={issuesStore.reasons.criticality}
              onCancel={() => setCritTarget(null)}
              onConfirm={(reasons, note) => {
                issuesStore.setCritical(critTarget.id, false, reasons, note);
                setCritTarget(null);
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default withPermissions(['SMART_ISSUES'])(
  withPageTitle('Smart Issues')(observer(IssuesList)),
);
