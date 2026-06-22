import { Button, Checkbox, Input, Popover, Segmented } from 'antd';
import { ChevronDown, Search, Tag as TagIcon } from 'lucide-react';
import React from 'react';

import type { MatchMode } from '../shared/model';

/* Tags multi-select with a stable trigger (never resizes as you select): a
   Popover with a match toggle, a search field and a scrollable checkbox list. */
export default function TagFilter({
  allTags,
  labels,
  match,
  onToggle,
  onSetMatch,
  onClear,
}: {
  allTags: string[];
  labels: string[];
  match: MatchMode;
  onToggle: (t: string) => void;
  onSetMatch: (m: MatchMode) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const n = labels.length;
  const shown = allTags.filter((t) =>
    t.toLowerCase().includes(q.toLowerCase().trim()),
  );

  const panel = (
    <div style={{ width: 288 }} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs color-gray-medium">Issues match</span>
        <Segmented
          size="small"
          value={match}
          onChange={(v) => onSetMatch(v as MatchMode)}
          options={[
            { label: 'AND', value: 'all' },
            { label: 'OR', value: 'any' },
          ]}
        />
      </div>

      <Input
        size="small"
        allowClear
        autoFocus
        placeholder="Search tags"
        prefix={<Search size={15} className="color-gray-medium mr-0.5" />}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="overflow-y-auto -mx-1 px-1" style={{ maxHeight: 256 }}>
        {shown.length ? (
          shown.map((t) => {
            const on = labels.includes(t);
            return (
              <div
                key={t}
                role="button"
                onClick={() => onToggle(t)}
                className={`flex items-center gap-2 px-2 h-8 rounded cursor-pointer hover:bg-active-blue${
                  on ? ' bg-active-blue-faded' : ''
                }`}
              >
                <Checkbox checked={on} tabIndex={-1} />
                <span className="truncate text-sm color-gray-darkest">{t}</span>
              </div>
            );
          })
        ) : (
          <div className="text-sm px-2 py-3 color-gray-medium">
            No tags match “{q}”
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-2">
        <span className="text-xs color-gray-medium">{n} selected</span>
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
      classNames={{
        root: 'rounded-lg border border-gray-200 shadow-xs overflow-hidden',
      }}
    >
      <Button size="small" icon={<TagIcon size={14} />}>
        Tags{n ? ` · ${n}` : ''}
        <ChevronDown size={13} className="ml-0.5 opacity-60" />
      </Button>
    </Popover>
  );
}
