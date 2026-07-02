import React from 'react';
import { Popover, Button, Input, Checkbox, Segmented } from 'antd';
import { Search, Tag as TagIcon, ChevronDown } from 'lucide-react';

/* Tags multi-select modeled on OpenReplay's FilterSelection + ValueAutoComplete:
   a STABLE trigger button (it never resizes as you select) that opens a Popover
   with a match toggle, a search field, and a scrollable checkbox list. Selection
   happens in the panel, so nothing in the toolbar reflows. */
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
  match: 'all' | 'any';
  onToggle: (t: string) => void;
  onSetMatch: (m: 'all' | 'any') => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const n = labels.length;
  const ql = q.toLowerCase().trim();
  const shown = allTags.filter((t) => t.toLowerCase().includes(ql));

  const panel = (
    <div style={{ width: 288 }} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--color-gray-medium)' }}>
          Issues match
        </span>
        <Segmented
          size="small"
          value={match}
          onChange={(v) => onSetMatch(v as 'all' | 'any')}
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
        prefix={<Search size={15} style={{ color: 'var(--color-gray-medium)', marginRight: 2 }} />}
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
                className={`flex items-center gap-2 px-2 rounded cursor-pointer hover:bg-active-blue${on ? ' bg-active-blue-faded' : ''}`}
                style={{ height: 32 }}
              >
                <Checkbox checked={on} tabIndex={-1} />
                <span className="truncate text-sm" style={{ color: 'var(--color-gray-darkest)' }}>
                  {t}
                </span>
              </div>
            );
          })
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
