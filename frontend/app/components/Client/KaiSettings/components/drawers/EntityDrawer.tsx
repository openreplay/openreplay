import { Button, Drawer, Select } from 'antd';
import { FlaskConical, LucideIcon, Play, Sparkles, X } from 'lucide-react';
import React from 'react';

// The three things a user can open from the tables. They share one shell so they read
// as the same family of objects; each owns a distinct accent + icon + word so you can
// never mistake which one you're looking at.
export type EntityType = 'draft' | 'test' | 'run';

interface TypeMeta {
  label: string;
  eyebrow: string;
  Icon: LucideIcon;
  square: string; // colored icon tile
  accentText: string;
  accentBorder: string;
}

export const TYPE_META: Record<EntityType, TypeMeta> = {
  // teal — a proposal from the agent, not yet real
  draft: {
    label: 'Draft',
    eyebrow: 'Draft · auto-generated',
    Icon: Sparkles,
    square: 'bg-tealx-light text-tealx',
    accentText: 'text-tealx',
    accentBorder: 'border-tealx',
  },
  // green — an approved, living test
  test: {
    label: 'Test',
    eyebrow: 'Test',
    Icon: FlaskConical,
    square: 'bg-green-light text-green-dark',
    accentText: 'text-green-dark',
    accentBorder: 'border-green',
  },
  // indigo — one historical execution
  run: {
    label: 'Run',
    eyebrow: 'Run',
    Icon: Play,
    square: 'bg-indigo-lightest text-indigo',
    accentText: 'text-indigo',
    accentBorder: 'border-indigo',
  },
};

interface DrawerProps {
  type: EntityType;
  open: boolean;
  onClose: () => void;
  title: string;
  /** eyebrow override (e.g. "Test · Paused") */
  eyebrow?: string;
  /** small line under the title */
  statusLine?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function EntityDrawer({
  type,
  open,
  onClose,
  title,
  eyebrow,
  statusLine,
  footer,
  children,
}: DrawerProps) {
  const meta = TYPE_META[type];
  const Icon = meta.Icon;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      closable={false}
      title={null}
      footer={footer}
      styles={{
        wrapper: { width: 560 },
        body: { padding: 0 },
        footer: { padding: '12px 20px' },
      }}
    >
      {/* shared header — accent + icon + type word is the constant "what am I looking at" */}
      <div
        className={`flex items-start gap-3 px-5 pt-5 pb-4 border-b-2 ${meta.accentBorder}`}
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${meta.square}`}
        >
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={`text-xs font-semibold uppercase tracking-wide ${meta.accentText}`}
          >
            {eyebrow ?? meta.eyebrow}
          </div>
          <div className="text-lg font-semibold text-black leading-tight mt-0.5 break-words">
            {title}
          </div>
          {statusLine && <div className="mt-1.5">{statusLine}</div>}
        </div>
        <Button
          type="text"
          size="small"
          icon={<X size={18} />}
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 -mr-1"
        />
      </div>

      {children}
    </Drawer>
  );
}

/** A titled block. Every section in every drawer uses this — that's the visual glue. */
export function Section({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-5 py-4 border-b last:border-b-0 ${className}`}>
      <div className="flex items-center justify-between min-h-[24px] mb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-disabled-text">
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Read-only key/value pairs (run detail, test summary). */
export function MetaGrid({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs text-disabled-text">{it.label}</span>
          <span className="text-sm text-black font-medium flex items-center gap-1.5">
            {it.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Stacked label + control, for editable fields. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-disabled-text">{label}</span>
      {children}
    </div>
  );
}

export function TagChips({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0)
    return <span className="text-sm text-disabled-text">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag}
          className="text-xs px-2 py-0.5 rounded bg-gray-lightest text-disabled-text"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

/** Up to 3 tags per test (Mehdi). */
export function TagEditor({
  value = [],
  onChange,
}: {
  value?: string[];
  onChange: (tags: string[]) => void;
}) {
  return (
    <Select
      mode="tags"
      size="small"
      value={value}
      onChange={(v: string[]) => onChange(v.slice(0, 3))}
      style={{ width: '100%' }}
      placeholder="Add up to 3 tags"
      maxTagCount={3}
      tokenSeparators={[',']}
    />
  );
}
