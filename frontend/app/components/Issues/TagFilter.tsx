import React from 'react';
import { Popover, Button, Input, Checkbox, Segmented } from 'antd';
import {
  Search,
  Tag as TagIcon,
  ChevronDown,
  CircleUser,
  Focus as FocusIcon,
  Globe,
} from 'lucide-react';
import type { IssueOrigin } from 'App/mstore/issuesStore';

/* Tags multi-select modeled on OpenReplay's FilterSelection + ValueAutoComplete:
   a STABLE trigger button (it never resizes as you select) that opens a Popover
   with a match toggle, a search field, and a scrollable checkbox list. Selection
   happens in the panel, so nothing in the toolbar reflows.

   It also hosts the FOUND IN section — where an issue was surfaced (full traffic
   or a focus) is an attribute of the issue, same species as its labels, and the
   rows even wear it as a chip in the Tags column. Display stays visibility-only. */

function CheckRow({
  on,
  onClick,
  icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-2 rounded cursor-pointer hover:bg-active-blue${on ? ' bg-active-blue-faded' : ''}`}
      style={{ height: 32 }}
    >
      <Checkbox checked={on} tabIndex={-1} />
      {icon}
      <span className="truncate text-sm" style={{ color: 'var(--color-gray-darkest)' }}>
        {children}
      </span>
    </div>
  );
}

const sectionLabel = (label: string, right?: React.ReactNode) => (
  <div className="flex items-center justify-between mt-1">
    <span
      className="text-[11px] font-medium uppercase tracking-wider"
      style={{ color: 'var(--color-gray-medium)' }}
    >
      {label}
    </span>
    {right}
  </div>
);

export default function TagFilter({
  allTags,
  labels,
  match,
  focuses,
  origins,
  onToggle,
  onToggleOrigin,
  onSetMatch,
  onClear,
}: {
  allTags: string[];
  labels: string[];
  match: 'all' | 'any';
  /** focuses available as "found in" options; `mine` powers the aggregate
      "My segments" row */
  focuses: { id: number; name: string; mine?: boolean }[];
  origins: IssueOrigin[];
  onToggle: (t: string) => void;
  onToggleOrigin: (o: IssueOrigin) => void;
  onSetMatch: (m: 'all' | 'any') => void;
  /** clears labels AND origins */
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const n = labels.length + origins.length;
  const ql = q.toLowerCase().trim();
  const shown = allTags.filter((t) => t.toLowerCase().includes(ql));
  // aggregate "mine" shortcut over the segments I own (Mehdi 07-07): on when
  // every one of my segments is selected; a click toggles them as a set
  const myIds = focuses.filter((f) => f.mine).map((f) => f.id);
  const mineOn = myIds.length > 0 && myIds.every((id) => origins.includes(id));
  const toggleMine = () => {
    (mineOn ? myIds : myIds.filter((id) => !origins.includes(id))).forEach(
      onToggleOrigin,
    );
  };

  const panel = (
    <div style={{ width: 288 }} className="flex flex-col gap-2">
      {/* FOUND IN — origin is an issue attribute, filtered like any tag */}
      {sectionLabel('Found in')}
      <div className="-mx-1 px-1">
        <CheckRow
          on={origins.includes('full')}
          onClick={() => onToggleOrigin('full')}
          icon={<Globe size={14} style={{ color: 'var(--color-gray-medium)' }} />}
        >
          Full traffic
        </CheckRow>
        {myIds.length > 0 && (
          <CheckRow
            on={mineOn}
            onClick={toggleMine}
            icon={<CircleUser size={14} style={{ color: 'var(--color-main)' }} />}
          >
            My segments
          </CheckRow>
        )}
        {focuses.map((f) => (
          <CheckRow
            key={f.id}
            on={origins.includes(f.id)}
            onClick={() => onToggleOrigin(f.id)}
            icon={<FocusIcon size={14} style={{ color: 'var(--color-main)' }} />}
          >
            {f.name}
          </CheckRow>
        ))}
      </div>

      {sectionLabel(
        'Labels',
        <Segmented
          size="small"
          value={match}
          onChange={(v) => onSetMatch(v as 'all' | 'any')}
          options={[
            { label: 'AND', value: 'all' },
            { label: 'OR', value: 'any' },
          ]}
        />,
      )}

      <Input
        size="small"
        allowClear
        placeholder="Search tags"
        prefix={<Search size={15} style={{ color: 'var(--color-gray-medium)', marginRight: 2 }} />}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="overflow-y-auto -mx-1 px-1" style={{ maxHeight: 224 }}>
        {shown.length ? (
          shown.map((t) => (
            <CheckRow key={t} on={labels.includes(t)} onClick={() => onToggle(t)}>
              {t}
            </CheckRow>
          ))
        ) : (
          <div className="text-sm px-2 py-3" style={{ color: 'var(--color-gray-medium)' }}>
            No tags match “{q}”
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-2">
        <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
          {n} selected
        </span>
        <Button type="text" size="small" disabled={!n} onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      content={panel}
      classNames={{ root: 'rounded-lg border border-gray-200 shadow-xs overflow-hidden' }}
    >
      <Button size="small" icon={<TagIcon size={14} />}>
        Tags{n ? ` · ${n}` : ''}
        <ChevronDown size={13} style={{ marginLeft: 2, opacity: 0.6 }} />
      </Button>
    </Popover>
  );
}
