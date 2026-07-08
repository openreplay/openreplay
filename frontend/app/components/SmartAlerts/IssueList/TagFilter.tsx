import { Button, Checkbox, Input, Popover, Segmented } from 'antd';
import {
  ChevronDown,
  CircleUser,
  Focus as FocusIcon,
  Globe,
  Search,
  Tag as TagIcon,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { IssueOrigin } from '../api';
import type { MatchMode } from '../shared/model';

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

/* Tags + "found in" origins in one stable-width popover. Origins (full traffic
   + focuses) are an issue attribute, filtered like tags. The aggregate "My
   segments" toggles all focuses I own as a set. */
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
  match: MatchMode;
  /** focuses available as "found in" options; `mine` powers "My segments" */
  focuses: { id: number; name: string; mine?: boolean }[];
  origins: IssueOrigin[];
  onToggle: (t: string) => void;
  onToggleOrigin: (o: IssueOrigin) => void;
  onSetMatch: (m: MatchMode) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const n = labels.length + origins.length;
  const ql = q.toLowerCase().trim();
  const shown = allTags.filter((tag) => tag.toLowerCase().includes(ql));

  const myIds = focuses.filter((f) => f.mine).map((f) => f.id);
  const mineOn = myIds.length > 0 && myIds.every((id) => origins.includes(id));
  const toggleMine = () =>
    (mineOn ? myIds : myIds.filter((id) => !origins.includes(id))).forEach(
      onToggleOrigin,
    );

  const panel = (
    <div style={{ width: 288 }} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs color-gray-medium">{t('Issues match')}</span>
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

      {/* FOUND IN — origin is an issue attribute, filtered like a tag */}
      {focuses.length > 0 && (
        <div className="flex flex-col -mx-1 px-1">
          <span className="text-xs color-gray-medium px-2 mb-0.5">
            {t('Found in')}
          </span>
          <CheckRow
            on={origins.includes('full')}
            onClick={() => onToggleOrigin('full')}
            icon={<Globe size={14} className="color-gray-medium" />}
          >
            {t('Full traffic')}
          </CheckRow>
          {myIds.length > 0 && (
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
          {focuses.map((f) => (
            <CheckRow
              key={f.id}
              on={origins.includes(f.id)}
              onClick={() => onToggleOrigin(f.id)}
              icon={
                <FocusIcon size={14} style={{ color: 'var(--color-main)' }} />
              }
            >
              {f.name}
            </CheckRow>
          ))}
        </div>
      )}

      <Input
        size="small"
        allowClear
        autoFocus
        placeholder={t('Search tags')}
        prefix={<Search size={15} className="color-gray-medium mr-0.5" />}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="overflow-y-auto -mx-1 px-1" style={{ maxHeight: 256 }}>
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

      <div className="flex items-center justify-between border-t pt-2">
        <span className="text-xs color-gray-medium">
          {t('{{n}} selected', { n })}
        </span>
        <Button type="text" size="small" disabled={!n} onClick={onClear}>
          {t('Clear')}
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
        {t('Tags')}
        {n ? ` · ${n}` : ''}
        <ChevronDown size={13} className="ml-0.5 opacity-60" />
      </Button>
    </Popover>
  );
}
