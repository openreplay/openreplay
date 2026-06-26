import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Popover,
  Segmented,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  Album,
  ArrowUpRight,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Info,
  MoreVertical,
  Pencil,
  SlidersHorizontal,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { useHistory } from 'App/routing';
import { smartIssueDetails, withSiteId } from 'App/saasComponents';

// BACKEND-PENDING: imports for the disabled date-range picker
// (uncomment together with the matching block below).
// import Period, { LAST_24_HOURS } from 'Types/app/period';
// import SelectDateRange from 'Shared/SelectDateRange';

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
  slugify,
} from '../shared';
import TagFilter from './TagFilter';

function IssuesList() {
  const { issuesStore, projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();

  const [dispOpen, setDispOpen] = React.useState(false);
  const [hideTarget, setHideTarget] = React.useState<Issue | null>(null);
  const [renameTarget, setRenameTarget] = React.useState<Issue | null>(null);
  // BACKEND-PENDING: state for the disabled date-range picker.
  // const [period, setPeriod] = React.useState<any>(
  //   Period({ rangeName: LAST_24_HOURS }),
  // );

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);

  const openDetail = (id: string) =>
    history.push(withSiteId(smartIssueDetails(slugify(id)), siteId));

  const showCategory = issuesStore.hasCategories;
  const showLastSeen = issuesStore.all.some((i) => i.seenAgoMin != null);

  const catValue: 'All' | CategoryName =
    issuesStore.cats.length === 1 ? issuesStore.cats[0] : 'All';
  const faded = (n: number) => <span className="opacity-50 ml-1.5">{n}</span>;
  const catTabOptions = [
    { value: 'All', label: <span>All{faded(issuesStore.all.length)}</span> },
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
        label: (
          <span>
            {c}
            {faded(issuesStore.catCount(c))}
          </span>
        ),
      };
    }),
  ];

  const columns: TableColumnsType<Issue> = [
    {
      title: 'Impact',
      dataIndex: 'impact',
      width: 96,
      sorter: (a, b) => a.impact - b.impact,
      showSorterTooltip: false,
      render: (v: number) => {
        const title = `${impactLevel(v)} impact`;
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
      title: 'Issue',
      dataIndex: 'head',
      sorter: (a, b) => a.head.localeCompare(b.head),
      showSorterTooltip: false,
      render: (head: string, r: Issue) => (
        <div className="flex items-center gap-2 min-w-0">
          <CriticalToggle
            critical={r.critical}
            stopPropagation
            onSet={(val, reason) => issuesStore.setCritical(r.id, val, reason)}
          />
          <span className="truncate font-medium color-gray-darkest">
            {head}
          </span>
          {issuesStore.showHidden && issuesStore.hidden.includes(r.id) && (
            <Tooltip
              title={
                issuesStore.dismissReasons[r.id]
                  ? `Dismissed: ${issuesStore.dismissReasons[r.id]}`
                  : 'Dismissed'
              }
            >
              <Tag className="rounded">Hidden</Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Tags',
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
            title: 'Last seen',
            dataIndex: 'seenAgoMin',
            width: 156,
            sorter: (a: Issue, b: Issue) =>
              (a.seenAgoMin ?? 0) - (b.seenAgoMin ?? 0),
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
        const isHidden = issuesStore.hidden.includes(r.id);
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
              },
              items: [
                {
                  key: 'detail',
                  icon: <ArrowUpRight size={14} />,
                  label: 'Open',
                },
                { key: 'rename', icon: <Pencil size={14} />, label: 'Rename' },
                { type: 'divider' },
                isHidden
                  ? { key: 'unhide', icon: <Eye size={14} />, label: 'Unhide' }
                  : { key: 'hide', icon: <EyeOff size={14} />, label: 'Hide' },
              ],
            }}
          >
            <Button
              type="text"
              size="small"
              className="flex items-center justify-center"
              aria-label="Issue actions"
              icon={<MoreVertical size={16} />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        );
      },
    },
  ];

  // Display filters run client-side over the already-loaded list.
  const dispCount =
    (issuesStore.critOnly ? 1 : 0) + (issuesStore.showHidden ? 1 : 0);

  const displayContent = (
    <div className="flex flex-col gap-2 p-1" style={{ minWidth: 170 }}>
      <Checkbox
        checked={issuesStore.critOnly}
        onChange={(e) => issuesStore.setCritOnly(e.target.checked)}
      >
        Critical only
      </Checkbox>
      <Checkbox
        checked={issuesStore.showHidden}
        onChange={(e) => issuesStore.setShowHidden(e.target.checked)}
      >
        Hidden
        {issuesStore.hidden.length ? ` (${issuesStore.hidden.length})` : ''}
      </Checkbox>
    </div>
  );

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Issues</span>
          <Tag
            color="#394DFE"
            className="rounded"
            style={{ fontSize: 10, fontWeight: 700, lineHeight: '16px' }}
          >
            BETA
          </Tag>
          <Tooltip
            placement="bottom"
            title="Issues our agents found while reviewing session replays for this project, ranked by impact. Open one to read the journey and jump straight to the moment it happened."
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
              Docs
            </Button>
          </a>
          <div className="min-w-50 md:w-1/4 md:min-w-75">
            <Input.Search
              size="small"
              allowClear
              maxLength={256}
              placeholder="Filter by issue or category"
              value={issuesStore.q}
              onChange={(e) => issuesStore.setQ(e.target.value)}
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

          {/* Display filters (critical-only / hidden) run client-side over the
              loaded issues. Hidden state isn't backend-persisted yet, so that
              list is usually empty — Critical-only is the useful one for now. */}
          <Popover
            open={dispOpen}
            onOpenChange={setDispOpen}
            trigger="click"
            placement="bottomRight"
            content={displayContent}
          >
            <Button size="small" icon={<SlidersHorizontal size={14} />}>
              Display{dispCount ? ` (${dispCount})` : ''}
              <ChevronDown size={13} className="ml-0.5 opacity-60" />
            </Button>
          </Popover>

          {/* Date range isn't range-scoped on the backend yet — shown disabled. */}
          <Tooltip title="Not available yet">
            <span className="inline-flex">
              <Button size="small" disabled icon={<Clock size={14} />}>
                Last 24 hours
                <ChevronDown size={13} className="ml-0.5 opacity-60" />
              </Button>
            </span>
          </Tooltip>

          {/* BACKEND-PENDING: the working date-range picker. Replace the disabled
              button above with this once issues are range-scoped on the server.
              Re-add the `Period` / `SelectDateRange` imports + `period` state.
          <SelectDateRange
            isAnt
            right
            useButtonStyle
            period={period}
            onChange={setPeriod}
          />
          */}
        </div>
      </div>

      <Table<Issue>
        className="[&_.ant-table-tbody>tr>td]:!py-0 [&_.ant-table-tbody>tr>td]:h-[55px]"
        rowKey="id"
        columns={columns}
        dataSource={issuesStore.list}
        loading={issuesStore.loading}
        pagination={false}
        rowClassName={(r) =>
          `cursor-pointer${issuesStore.hidden.includes(r.id) ? ' opacity-60' : ''}`
        }
        onRow={(r) => ({ onClick: () => openDetail(r.id) })}
        locale={{ emptyText: 'No issues match these filters.' }}
      />

      <div className="px-4 py-3 text-xs color-gray-medium">
        Showing {issuesStore.list.length} of {issuesStore.all.length} issues
      </div>

      <HideIssueModal
        open={hideTarget != null}
        head={hideTarget?.head}
        onCancel={() => setHideTarget(null)}
        onConfirm={(note, tags) => {
          if (hideTarget) issuesStore.hide(hideTarget.id, note, tags);
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

export default observer(IssuesList);
