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
  Search,
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

  const catOptions = CAT_ORDER.map((c) => ({
    label: `${c} · ${issuesStore.catCount(c)}`,
    value: c,
  }));
  const tagOptions = issuesStore.allTags.map((t) => ({ label: t, value: t }));

  const dispCount = (issuesStore.critOnly ? 1 : 0) + (issuesStore.showHidden ? 1 : 0);

  const columns: TableColumnsType<Issue> = [
    {
      title: 'Impact',
      dataIndex: 'impact',
      width: 96,
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
      render: (c: CategoryName) => {
        const Ic = CAT_ICON[c];
        return (
          <span className="inline-flex items-center" style={{ gap: 7 }}>
            <Ic size={15} style={{ color: CAT_COLOR[c], flexShrink: 0 }} />
            <span style={{ color: 'var(--color-gray-darkest)' }}>{c}</span>
          </span>
        );
      },
    },
    {
      title: 'Issue',
      dataIndex: 'head',
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
      width: 110,
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
        Show hidden{issuesStore.hidden.length ? ` (${issuesStore.hidden.length})` : ''}
      </Checkbox>
    </div>
  );

  return (
    <div
      className="flex flex-col rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      {/* header */}
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
      </div>

      {/* single-line toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b flex-wrap">
        <div style={{ width: 248 }}>
          <Input
            placeholder="Search issues, tags, users…"
            allowClear
            prefix={<Search size={15} style={{ color: 'var(--color-gray-medium)' }} />}
            value={issuesStore.q}
            onChange={(e) => issuesStore.setQ(e.target.value)}
          />
        </div>

        <div className="flex-1" />

        <Select
          mode="multiple"
          allowClear
          placeholder="Category"
          maxTagCount="responsive"
          style={{ minWidth: 150 }}
          options={catOptions}
          value={issuesStore.cats}
          onChange={(v) => issuesStore.setCats(v as CategoryName[])}
        />

        <Select
          mode="multiple"
          allowClear
          placeholder="Tags"
          maxTagCount="responsive"
          style={{ minWidth: 150 }}
          options={tagOptions}
          value={issuesStore.labels}
          onChange={(v) => issuesStore.setLabels(v as string[])}
        />

        {issuesStore.labels.length > 1 && (
          <Segmented
            size="small"
            value={issuesStore.match}
            onChange={(v) => issuesStore.setMatch(v as 'all' | 'any')}
            options={[
              { label: 'All', value: 'all' },
              { label: 'Any', value: 'any' },
            ]}
          />
        )}

        <Select
          style={{ width: 130 }}
          value={issuesStore.sort}
          onChange={(v) => issuesStore.setSort(v as 'impact' | 'newest')}
          options={[
            { label: 'Sort: Impact', value: 'impact' },
            { label: 'Sort: Newest', value: 'newest' },
          ]}
        />

        <Popover
          open={dispOpen}
          onOpenChange={setDispOpen}
          trigger="click"
          placement="bottomRight"
          content={displayContent}
        >
          <Button icon={<SlidersHorizontal size={14} />}>
            Display{dispCount ? ` (${dispCount})` : ''}
          </Button>
        </Popover>

        <Select
          style={{ width: 150 }}
          defaultValue="24h"
          options={[
            { label: 'Last 24 hours', value: '24h' },
            { label: 'Last 7 days', value: '7d' },
            { label: 'Last 30 days', value: '30d' },
          ]}
        />
      </div>

      <Table<Issue>
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
        Showing {issuesStore.list.length} of {issuesStore.all.length} issues · ranked by{' '}
        {issuesStore.sort}
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
