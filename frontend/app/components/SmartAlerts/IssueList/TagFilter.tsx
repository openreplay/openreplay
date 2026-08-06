import { Button, Checkbox, Input, Popover, Segmented, message } from 'antd';
import {
  ChevronDown,
  CircleUser,
  Globe,
  Plus,
  Search,
  Split,
  Tag as TagIcon,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { IssueOrigin } from '../api';
import TagDialog from '../shared/TagDialog';
import type { MatchMode } from '../shared/model';

/* The list's attribute filters: stable trigger buttons (they never resize as
   you select) opening Popovers where the selection happens, so the toolbar
   never reflows. */

export function CheckRow({
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
      className={`flex items-center gap-2 px-2 h-8 rounded cursor-pointer hover:bg-active-blue${
        on ? ' bg-active-blue-faded' : ''
      }`}
    >
      <Checkbox checked={on} tabIndex={-1} />
      {icon}
      <span className="truncate text-sm color-gray-darkest">{children}</span>
    </div>
  );
}

function PanelFooter({ n, onClear }: { n: number; onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between border-t pt-2">
      <span className="text-xs color-gray-medium">
        {t('{{n}} selected', { n })}
      </span>
      <Button type="text" size="small" disabled={!n} onClick={onClear}>
        {t('Clear')}
      </Button>
    </div>
  );
}

const popoverClassNames = {
  root: 'rounded-lg border border-gray-200 shadow-xs overflow-hidden',
};

/* ──────────────────────────── Tags ──────────────────────────── */

export default function TagFilter({
  allTags,
  labels,
  match,
  onToggle,
  onSetMatch,
  onClear,
  onCreateTag,
}: {
  allTags: string[];
  labels: string[];
  match: MatchMode;
  onToggle: (t: string) => void;
  onSetMatch: (m: MatchMode) => void;
  onClear: () => void;
  /** creates a custom journey tag (name + NL description); returns false when the name is already taken */
  onCreateTag?: (name: string, description: string) => boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const n = labels.length;
  const ql = q.toLowerCase().trim();
  const shown = allTags.filter((tag) => tag.toLowerCase().includes(ql));

  const createTag = (name: string, description: string) => {
    if (onCreateTag?.(name, description) === false) {
      message.error(t('A tag with that name already exists.'));
      return;
    }
    message.success(
      t('Tag created. The agent starts applying it to new sessions.'),
    );
    setCreating(false);
  };

  const panel = (
    <div style={{ width: 272 }} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          size="small"
          allowClear
          placeholder={t('Search tags')}
          prefix={<Search size={15} className="color-gray-medium mr-0.5" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Segmented
          size="small"
          value={match}
          onChange={(v) => onSetMatch(v as MatchMode)}
          options={[
            { label: t('AND'), value: 'all' },
            { label: t('OR'), value: 'any' },
          ]}
        />
      </div>

      <div className="overflow-y-auto -mx-1 px-1" style={{ maxHeight: 224 }}>
        {shown.length ? (
          shown.map((tag) => (
            <CheckRow
              key={tag}
              on={labels.includes(tag)}
              onClick={() => onToggle(tag)}
            >
              {tag}
            </CheckRow>
          ))
        ) : (
          <div className="text-sm px-2 py-3 color-gray-medium">
            {t('No tags match “{{q}}”', { q })}
          </div>
        )}
      </div>

      {onCreateTag && (
        <Button
          type="link"
          size="small"
          icon={<Plus size={14} />}
          onClick={() => setCreating(true)}
          className="self-start !px-0"
        >
          {t('New tag')}
        </Button>
      )}

      <PanelFooter n={n} onClear={onClear} />
    </div>
  );

  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        content={panel}
        classNames={popoverClassNames}
      >
        <Button size="small" icon={<TagIcon size={14} />}>
          {t('Tags')}
          {n ? ` · ${n}` : ''}
          <ChevronDown size={13} className="ml-0.5 opacity-60" />
        </Button>
      </Popover>

      <TagDialog
        open={creating}
        onCancel={() => setCreating(false)}
        onSave={createTag}
      />
    </>
  );
}

/* ─────────────────────────── Segments ─────────────────────────── */

/** "Found in" filter dropdown: shows first 5 segments at rest, search to find the rest. */
export function SegmentFilter({
  segments,
  origins,
  onToggleOrigin,
  onSetOrigins,
  onClear,
  showFullTraffic = true,
}: {
  /** `mine` powers the aggregate "My segments" row */
  segments: { id: string; name: string; mine?: boolean }[];
  origins: IssueOrigin[];
  onToggleOrigin: (o: IssueOrigin) => void;
  /** replaces the whole selection at once — toggling ids one by one fires a refetch per id */
  onSetOrigins: (o: IssueOrigin[]) => void;
  onClear: () => void;
  /** the issue page scopes sessions to segments only — no "Full traffic" row */
  showFullTraffic?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const n = origins.length;
  const ql = q.toLowerCase().trim();
  const SEG_CAP = 5;

  const shown = ql
    ? segments.filter((s) => s.name.toLowerCase().includes(ql))
    : segments;
  const rest = ql ? shown : shown.slice(0, SEG_CAP);
  const hidden = shown.length - rest.length;
  const showFull = showFullTraffic && (!ql || 'full traffic'.includes(ql));
  const myIds = segments.filter((s) => s.mine).map((s) => s.id);
  const mineOn = myIds.length > 0 && myIds.every((id) => origins.includes(id));
  const showMine = myIds.length > 0 && (!ql || 'my segments'.includes(ql));
  const toggleMine = () =>
    onSetOrigins(
      mineOn
        ? origins.filter((o) => !myIds.includes(o))
        : [...origins, ...myIds.filter((id) => !origins.includes(id))],
    );

  const panel = (
    <div style={{ width: 260 }} className="flex flex-col gap-2">
      {segments.length > SEG_CAP && (
        <Input
          size="small"
          allowClear
          placeholder={t('Search segments')}
          prefix={<Search size={15} className="color-gray-medium mr-0.5" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}
      <div className="-mx-1 px-1">
        {showFull && (
          <CheckRow
            on={origins.includes('full')}
            onClick={() => onToggleOrigin('full')}
            icon={<Globe size={14} className="color-gray-medium" />}
          >
            {t('Full traffic')}
          </CheckRow>
        )}
        {showMine && (
          <CheckRow
            on={mineOn}
            onClick={toggleMine}
            icon={
              <CircleUser size={14} style={{ color: 'var(--color-main)' }} />
            }
          >
            {t('My segments')}
          </CheckRow>
        )}
        {rest.map((s) => (
          <CheckRow
            key={s.id}
            on={origins.includes(s.id)}
            onClick={() => onToggleOrigin(s.id)}
            icon={<Split size={14} style={{ color: 'var(--color-main)' }} />}
          >
            {s.name}
          </CheckRow>
        ))}
        {hidden > 0 && (
          <div className="text-xs px-2 py-1 color-gray-medium">
            {t('{{n}} more · search to find them', { n: hidden })}
          </div>
        )}
        {ql && !showFull && !showMine && shown.length === 0 && (
          <div className="text-xs px-2 py-1 color-gray-medium">
            {t('No segments match “{{q}}”', { q })}
          </div>
        )}
      </div>
      <PanelFooter n={n} onClear={onClear} />
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
      classNames={popoverClassNames}
    >
      <Button size="small" icon={<Split size={14} />}>
        {t('Segments')}
        {n ? ` · ${n}` : ''}
        <ChevronDown size={13} className="ml-0.5 opacity-60" />
      </Button>
    </Popover>
  );
}
