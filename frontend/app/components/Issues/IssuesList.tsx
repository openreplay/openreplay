import React from 'react';
import {
  Input,
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
  EllipsisVertical,
  Pencil,
  Eye,
  EyeOff,
  AlertTriangle,
  SlidersHorizontal,
  Album,
  ChevronDown,
  Focus as FocusIcon,
  Globe,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useHistory } from 'App/routing';
import { withSiteId, issue as issueRoute } from 'App/routes';
import {
  type Issue,
  type CategoryName,
  CAT_ORDER,
  CAT_ICON,
  HIDE_REASONS,
  CRITICAL_REASONS,
  impactLevel,
  lastSeenLabel,
  lastSeenExact,
} from 'App/mstore/issuesStore';
import SelectDateRange from 'Shared/SelectDateRange';
import Period, { LAST_24_HOURS } from 'Types/app/period';
import { Pagination } from 'UI';
import TagFilter from './TagFilter';
import FocusButton from './focus/FocusButton';
import { ImpactGauge, ReasonChip } from './ProblemCard';
import './issues.css';


function RowTagChip({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-md border whitespace-nowrap"
      style={{
        borderColor: 'var(--color-gray-light)',
        background: 'var(--color-gray-lightest)',
        color: 'var(--color-gray-dark)',
      }}
    >
      {label}
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
  const [hideTags, setHideTags] = React.useState<string[]>([]);
  const [critTarget, setCritTarget] = React.useState<Issue | null>(null);
  const [critReason, setCritReason] = React.useState('');
  const [critTags, setCritTags] = React.useState<string[]>([]);
  const [renameTarget, setRenameTarget] = React.useState<Issue | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 10;
  // reset to the first page whenever the filtered set size changes
  const totalIssues = issuesStore.list.length;
  React.useEffect(() => {
    setPage(1);
  }, [totalIssues]);
  const pagedIssues = issuesStore.list.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const rangeStart = totalIssues === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + pagedIssues.length;
  // Presentational period (issues are mock; matches the Sessions date picker).
  const [period, setPeriod] = React.useState<any>(
    Period({ rangeName: LAST_24_HOURS }),
  );

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
        // neutral icon — no per-category color (like Sessions)
        icon: <Ic size={14} strokeWidth={2} />,
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
      render: (v: number) => {
        const level = impactLevel(v);
        const title = `${level} impact`;
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
          <Tooltip title={r.critical ? 'Critical — click to remove' : 'Mark as critical'}>
            <Button
              type="text"
              size="small"
              className={`critical-toggle flex items-center justify-center shrink-0${
                r.critical ? ' critical-on' : ''
              }`}
              aria-label={r.critical ? 'Remove critical flag' : 'Mark as critical'}
              aria-pressed={r.critical}
              icon={
                <AlertTriangle
                  size={15}
                  strokeWidth={2}
                  style={{
                    color: r.critical ? 'var(--color-red)' : undefined,
                    fill: 'none',
                  }}
                />
              }
              onClick={(e) => {
                e.stopPropagation();
                if (r.critical) {
                  setCritTarget(r);
                  setCritReason('');
                  setCritTags([]);
                } else {
                  issuesStore.setCritical(r.id, true);
                }
              }}
            />
          </Tooltip>
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
      title: 'Tags',
      dataIndex: 'tags',
      width: 200,
      render: (tags: string[], r: Issue) => {
        const focus = issuesStore.focusById(r.focusId);
        const visible = tags.slice(0, 1);
        const hidden = tags.slice(1);
        return (
          <div className="flex items-center gap-1 overflow-hidden">
            {/* origin chip — every issue carries one: a focus find shows the focus
                icon in blue, a full-traffic find the globe in gray. The chip itself
                stays a normal tag (gray border/bg); only the icon carries meaning.
                Pairs with the "Found in" filters inside the Tags dropdown. */}
            <Tooltip
              title={focus ? `Found in focus: ${focus.name}` : 'Found in full traffic'}
              placement="top"
            >
              <span
                className="rounded-md border flex items-center justify-center shrink-0 cursor-default"
                style={{
                  width: 22,
                  height: 22,
                  borderColor: 'var(--color-gray-light)',
                  background: 'var(--color-gray-lightest)',
                  color: focus ? 'var(--color-main)' : 'var(--color-gray-medium)',
                }}
              >
                {focus ? <FocusIcon size={13} /> : <Globe size={13} />}
              </span>
            </Tooltip>
            {visible.map((t) => <RowTagChip key={t} label={t} />)}
            {hidden.length > 0 && (
              <Tooltip title={hidden.join(', ')} placement="top">
                <span className="text-xs shrink-0 cursor-default" style={{ color: 'var(--color-gray-medium)' }}>+{hidden.length}</span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Last seen',
      dataIndex: 'seenAgoMin',
      width: 156,
      sorter: (a, b) => a.seenAgoMin - b.seenAgoMin,
      showSorterTooltip: false,
      render: (m: number) => (
        <Tooltip title={lastSeenExact(m)}>
          <span className="text-sm tabular-nums" style={{ color: 'var(--color-gray-medium)' }}>
            {lastSeenLabel(m)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 56,
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
                if (key === 'rename') {
                  setRenameTarget(r);
                  setRenameValue(r.head);
                } else if (key === 'hide') {
                  setHideTarget(r);
                  setHideReason('');
                  setHideTags([]);
                } else if (key === 'unhide') issuesStore.unhide(r.id);
              },
              items: [
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
              aria-label="Issue actions"
              icon={<EllipsisVertical size={16} />}
              onClick={(e) => e.stopPropagation()}
            />
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
            BETA
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
          <FocusButton />
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

      {/* category tabs (left) + remaining controls (right) — bar height matches
          the Sessions tab bar (SessionHeader: px-4 py-3) */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-wrap">
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
            focuses={issuesStore.focuses.map((f) => ({ id: f.id, name: f.name }))}
            origins={issuesStore.origins}
            onToggle={issuesStore.toggleLabel}
            onToggleOrigin={issuesStore.toggleOrigin}
            onSetMatch={issuesStore.setMatch}
            onClear={() => {
              issuesStore.setLabels([]);
              issuesStore.clearOrigins();
            }}
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
              <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.6 }} />
            </Button>
          </Popover>

          {/* date picker styled as an outlined dropdown to match Tags / Display,
              with a calendar icon. Keeps the Sessions custom-range picker. */}
          <span className="issues-date-range">
            <SelectDateRange
              isAnt
              right
              useButtonStyle
              period={period}
              onChange={setPeriod}
            />
          </span>
        </div>
      </div>

      <Table<Issue>
        className="issues-table"
        rowKey="id"
        columns={columns}
        dataSource={pagedIssues}
        pagination={false}
        rowClassName={(r) =>
          `cursor-pointer${issuesStore.hidden.includes(r.id) ? ' opacity-60' : ''}`
        }
        onRow={(r) => ({ onClick: () => openDetail(r.id) })}
        locale={{ emptyText: 'No issues match these filters.' }}
      />

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
          Showing {rangeStart}–{rangeEnd} of {totalIssues} issues
        </span>
        {totalIssues > PAGE_SIZE && (
          <div className="w-[200px]">
            <Pagination
              page={page}
              total={totalIssues}
              limit={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* hide-with-reason modal */}
      <Modal
        title="Hide this issue?"
        open={hideTarget != null}
        onCancel={() => setHideTarget(null)}
        onOk={() => {
          if (hideTarget)
            issuesStore.hide(hideTarget.id, hideReason.trim(), hideTags);
          setHideTarget(null);
        }}
        okText="Hide issue"
      >
        <p className="mb-3" style={{ color: 'var(--color-gray-dark)' }}>
          “{hideTarget?.head}” will be removed from the list. Tell us why so the agent can learn.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {HIDE_REASONS.map((t) => (
            <ReasonChip
              key={t}
              label={t}
              checked={hideTags.includes(t)}
              onChange={(on) =>
                setHideTags((prev) =>
                  on ? [...prev, t] : prev.filter((x) => x !== t),
                )
              }
            />
          ))}
        </div>
        <Input.TextArea
          rows={3}
          placeholder="Add a note (optional)…"
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

      {/* remove-critical reason modal — unmarking is a teaching moment */}
      <Modal
        title="Remove critical flag?"
        open={critTarget != null}
        onCancel={() => setCritTarget(null)}
        onOk={() => {
          if (critTarget)
            issuesStore.setCritical(
              critTarget.id,
              false,
              [...critTags, critReason.trim()].filter(Boolean).join(' · '),
            );
          setCritTarget(null);
        }}
        okText="Mark as not critical"
      >
        <p className="mb-3" style={{ color: 'var(--color-gray-dark)' }}>
          “{critTarget?.head}” will no longer be flagged critical. Tell us why so the agent can learn.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {CRITICAL_REASONS.map((t) => (
            <ReasonChip
              key={t}
              label={t}
              checked={critTags.includes(t)}
              onChange={(on) =>
                setCritTags((prev) =>
                  on ? [...prev, t] : prev.filter((x) => x !== t),
                )
              }
            />
          ))}
        </div>
        <Input.TextArea
          rows={3}
          placeholder="Add a note (optional)…"
          value={critReason}
          onChange={(e) => setCritReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}

export default observer(IssuesList);
