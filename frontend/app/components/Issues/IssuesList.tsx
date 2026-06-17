import React from 'react';
import {
  Input,
  Select,
  Segmented,
  Table,
  Tag,
  Tooltip,
  Dropdown,
  Popover,
  Checkbox,
  Modal,
  Button,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  Info,
  MoreHorizontal,
  ArrowUpRight,
  Pencil,
  Eye,
  EyeOff,
  SlidersHorizontal,
  CircleX,
  MousePointerClick,
  Gauge,
} from 'lucide-react';
import { WarningFilled } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useHistory } from 'App/routing';
import { withSiteId, issue as issueRoute } from 'App/routes';
import {
  type Issue,
  type CategoryName,
  CAT_ORDER,
  CAT_COLOR,
  impactLevel,
  IMPACT_FILLED,
  IMPACT_COLOR,
  lastSeenLabel,
  lastSeenExact,
} from 'App/mstore/issuesStore';
import TagFilter from './TagFilter';
import './issues.css';

/* Each category keeps its color, but carried by a small icon (a shape cue) rather
   than a filled chip — so the colored area shrinks and category stops looking like
   the (neutral) tag/metatag chips. */
const CAT_ICON: Record<
  CategoryName,
  React.ComponentType<{ size?: number; style?: React.CSSProperties }>
> = {
  Errors: CircleX,
  'UI/UX': MousePointerClick,
  Slowness: Gauge,
};

/* Impact as three thin rounded ticks — fill count + color encode the level
   (High / Medium / Low), no number. Unlit ticks stay faint. */
function ImpactTicks({ value }: { value: number }) {
  const level = impactLevel(value);
  const filled = IMPACT_FILLED[level];
  const color = IMPACT_COLOR[level];
  return (
    <span className="inline-flex items-center" style={{ gap: 4 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: 13,
            borderRadius: 2,
            background:
              i < filled
                ? color
                : 'color-mix(in srgb, var(--color-gray-light) 55%, white)',
          }}
        />
      ))}
    </span>
  );
}

function IssuesList() {
  const { issuesStore } = useStore();
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();

  const [dispOpen, setDispOpen] = React.useState(false);
  const [hideTarget, setHideTarget] = React.useState<Issue | null>(null);
  const [hideReason, setHideReason] = React.useState('');
  const [renameTarget, setRenameTarget] = React.useState<Issue | null>(null);
  const [renameValue, setRenameValue] = React.useState('');

  const openDetail = (id: number) =>
    history.push(withSiteId(issueRoute(String(id)), siteId));

  // Category as a Segmented tab bar (like the Sessions tabs): All + one tab per
  // category, single-select. "All" maps to no category filter.
  const catValue: 'All' | CategoryName =
    issuesStore.cats.length === 1 ? issuesStore.cats[0] : 'All';
  const faded = (n: number) => (
    <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>
  );
  // mirror SessionTags.tsx: Segmented with the icon passed via the `icon` prop
  const catTabOptions = [
    { value: 'All', label: <span>All{faded(issuesStore.all.length)}</span> },
    ...CAT_ORDER.map((c) => {
      const Ic = CAT_ICON[c];
      return {
        value: c,
        // colored only while this tab is active; neutral otherwise (like Sessions)
        icon: <Ic size={14} style={{ color: c === catValue ? CAT_COLOR[c] : undefined }} />,
        label: <span>{c}{faded(issuesStore.catCount(c))}</span>,
      };
    }),
  ];

  const dispCount = (issuesStore.critOnly ? 1 : 0) + (issuesStore.showHidden ? 1 : 0);

  const columns: TableColumnsType<Issue> = [
    {
      title: 'Impact',
      dataIndex: 'impact',
      width: 96,
      sorter: (a, b) => a.impact - b.impact,
      showSorterTooltip: false,
      defaultSortOrder: 'descend',
      render: (v: number, r: Issue) => {
        const level = impactLevel(v);
        const title = r.critical ? `Critical · ${level} impact` : `${level} impact`;
        return (
          <Tooltip title={title}>
            <span
              className="inline-flex items-center"
              style={{ gap: 8 }}
              role="img"
              aria-label={title}
            >
              <ImpactTicks value={v} />
              {r.critical && (
                <WarningFilled style={{ color: 'var(--color-red)', fontSize: 14 }} />
              )}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Category',
      dataIndex: 'cat',
      width: 140,
      sorter: (a, b) => a.cat.localeCompare(b.cat),
      showSorterTooltip: false,
      render: (c: CategoryName) => {
        const Ic = CAT_ICON[c];
        return (
          <span className="inline-flex items-center" style={{ gap: 7 }}>
            <Ic
              className="cat-ic"
              size={15}
              style={{ ['--cat' as string]: CAT_COLOR[c], flexShrink: 0 }}
            />
            <span style={{ color: 'var(--color-gray-darkest)' }}>{c}</span>
          </span>
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
          <span className="truncate font-medium" style={{ color: 'var(--color-gray-darkest)' }}>
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
              <Tag style={{ borderRadius: 4 }}>Hidden</Tag>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Last seen',
      dataIndex: 'seenAgoMin',
      width: 132,
      sorter: (a, b) => a.seenAgoMin - b.seenAgoMin,
      showSorterTooltip: false,
      render: (m: number) => (
        <Tooltip title={lastSeenExact(m)}>
          <span className="text-xs tabular-nums" style={{ color: 'var(--color-gray-medium)' }}>
            {lastSeenLabel(m)}
          </span>
        </Tooltip>
      ),
    },
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
                else if (key === 'rename') {
                  setRenameTarget(r);
                  setRenameValue(r.head);
                } else if (key === 'hide') {
                  setHideTarget(r);
                  setHideReason('');
                } else if (key === 'unhide') issuesStore.unhide(r.id);
              },
              items: [
                { key: 'detail', icon: <ArrowUpRight size={14} />, label: 'Open details' },
                { key: 'rename', icon: <Pencil size={14} />, label: 'Rename' },
                { type: 'divider' },
                isHidden
                  ? { key: 'unhide', icon: <Eye size={14} />, label: 'Unhide' }
                  : { key: 'hide', icon: <EyeOff size={14} />, label: 'Hide' },
              ],
            }}
          >
            <button
              className="flex items-center justify-center rounded p-1 hover:bg-gray-lightest"
              aria-label="Issue actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={16} />
            </button>
          </Dropdown>
        );
      },
    },
  ];

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
        Hidden{issuesStore.hidden.length ? ` (${issuesStore.hidden.length})` : ''}
      </Checkbox>
    </div>
  );

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      {/* header — title left, OpenReplay-style search on the right */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">Issues</span>
          <Tag color="#394DFE" style={{ borderRadius: 4, fontSize: 10, fontWeight: 700, lineHeight: '16px' }}>
            AI · BETA
          </Tag>
          <Tooltip
            placement="bottom"
            title="Issues our agents found while reviewing session replays for this project, ranked by impact. Open one to read the journey and jump straight to the moment it happened, with no need to watch the full recording."
          >
            <span className="flex items-center cursor-help" style={{ color: 'var(--color-gray-medium)' }}>
              <Info size={15} />
            </span>
          </Tooltip>
        </div>
        <Input.Search
          size="small"
          allowClear
          maxLength={256}
          placeholder="Filter by name or description"
          style={{ width: 280 }}
          value={issuesStore.q}
          onChange={(e) => issuesStore.setQ(e.target.value)}
        />
      </div>

      {/* category tabs (left) + remaining controls (right) */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b flex-wrap">
        <Segmented
          size="small"
          value={catValue}
          onChange={(v) => issuesStore.setCats(v === 'All' ? [] : [v as CategoryName])}
          options={catTabOptions}
        />

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
              Display{dispCount ? ` (${dispCount})` : ''}
            </Button>
          </Popover>

          <Select
            size="small"
            style={{ width: 150 }}
            defaultValue="24h"
            options={[
              { label: 'Last 24 hours', value: '24h' },
              { label: 'Last 7 days', value: '7d' },
              { label: 'Last 30 days', value: '30d' },
            ]}
          />
        </div>
      </div>

      <Table<Issue>
        className="issues-table"
        rowKey="id"
        columns={columns}
        dataSource={issuesStore.list}
        pagination={false}
        rowClassName={(r) =>
          `cursor-pointer${issuesStore.hidden.includes(r.id) ? ' opacity-60' : ''}`
        }
        onRow={(r) => ({ onClick: () => openDetail(r.id) })}
        locale={{ emptyText: 'No issues match these filters.' }}
      />

      <div className="px-4 py-3 text-xs" style={{ color: 'var(--color-gray-medium)' }}>
        Showing {issuesStore.list.length} of {issuesStore.all.length} issues
      </div>

      {/* hide-with-reason modal */}
      <Modal
        title="Hide this issue?"
        open={hideTarget != null}
        onCancel={() => setHideTarget(null)}
        onOk={() => {
          if (hideTarget) issuesStore.hide(hideTarget.id, hideReason.trim());
          setHideTarget(null);
        }}
        okText="Hide issue"
      >
        <p className="mb-2" style={{ color: 'var(--color-gray-dark)' }}>
          “{hideTarget?.head}” will be removed from the list. Tell us why so the agent can learn.
        </p>
        <Input.TextArea
          rows={3}
          autoFocus
          placeholder="e.g. Not a real issue, already fixed, expected behavior…"
          value={hideReason}
          onChange={(e) => setHideReason(e.target.value)}
        />
      </Modal>

      {/* rename modal */}
      <Modal
        title="Rename issue"
        open={renameTarget != null}
        onCancel={() => setRenameTarget(null)}
        onOk={() => {
          const v = renameValue.trim();
          if (renameTarget && v) issuesStore.rename(renameTarget.id, v);
          setRenameTarget(null);
        }}
        okText="Save"
      >
        <Input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPressEnter={() => {
            const v = renameValue.trim();
            if (renameTarget && v) issuesStore.rename(renameTarget.id, v);
            setRenameTarget(null);
          }}
        />
      </Modal>
    </div>
  );
}

export default observer(IssuesList);
