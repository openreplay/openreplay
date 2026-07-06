import { Drawer, Tooltip } from 'antd';
import {
  FlaskConical,
  LucideIcon,
  Play,
  Plus,
  Sparkles,
  SquarePen,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
  // gray — an AI proposal from the agent, not yet real
  draft: {
    label: 'Draft',
    eyebrow: 'Draft',
    Icon: Sparkles,
    square: 'bg-gray-lightest text-gray-dark',
    accentText: 'text-gray-dark',
    accentBorder: 'border-gray-light',
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
  /** when set, the title becomes inline-editable (rename) */
  onTitleChange?: (title: string) => void;
  /** small line under the title */
  statusLine?: React.ReactNode;
  /** actions rendered top-right in the header, before the close icon */
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function EntityDrawer({
  type,
  open,
  onClose,
  title,
  eyebrow,
  onTitleChange,
  statusLine,
  headerActions,
  footer,
  children,
}: DrawerProps) {
  const meta = TYPE_META[type];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      rootClassName="kai-entity-drawer"
      placement="right"
      // native antd header: standard close icon (matches the app's other drawers),
      // actions in `extra`, the title block carries eyebrow + name + status line.
      closable
      title={
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-disabled-text">
            {eyebrow ?? meta.eyebrow}
          </div>
          {onTitleChange ? (
            <EditableTitle title={title} onChange={onTitleChange} />
          ) : (
            <div className="text-xl font-semibold text-black leading-tight mt-1 break-words">
              {title}
            </div>
          )}
          {statusLine && <div className="mt-2 font-normal">{statusLine}</div>}
        </div>
      }
      extra={headerActions}
      footer={footer}
      styles={{
        wrapper: { width: 560 },
        body: { padding: 0 },
        // 24px right/left = the header's padding, so the footer's primary button
        // right-aligns with the header actions (Mehdi 07-06: Run now ↔ Save)
        footer: { padding: '12px 24px' },
      }}
    >
      {children}
    </Drawer>
  );
}

/** The drawer title as a click-to-rename field. Pencil appears on hover; Enter/blur
 *  commits, Escape reverts. Keeps the big semibold title styling while editing. */
function EditableTitle({
  title,
  onChange,
}: {
  title: string;
  onChange: (title: string) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);

  useEffect(() => {
    setVal(title);
  }, [title]);

  const commit = () => {
    const v = val.trim();
    if (v && v !== title) onChange(v);
    else setVal(title);
    setEditing(false);
  };

  // both states live in the same fixed-height row so toggling edit never grows the
  // header; mr-4 keeps the input clear of the header action buttons
  if (editing) {
    return (
      <div className="mt-1 h-8 flex items-center min-w-0 mr-4">
        <input
          autoFocus
          value={val}
          aria-label={t('Test name')}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setVal(title);
              setEditing(false);
            }
          }}
          className="text-xl font-semibold text-black leading-tight w-full h-8 rounded border px-2 -mx-2 py-0 outline-none"
          style={{ borderColor: 'var(--color-gray-light)' }}
        />
      </div>
    );
  }

  return (
    <div className="group mt-1 h-8 flex items-center gap-2 min-w-0 mr-4">
      <span className="text-xl font-semibold text-black leading-tight truncate">
        {title}
      </span>
      <Tooltip title={t('Rename')}>
        <button
          type="button"
          aria-label={t('Rename')}
          onClick={() => setEditing(true)}
          className="shrink-0 text-disabled-text hover:text-gray-dark opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <SquarePen size={15} />
        </button>
      </Tooltip>
    </div>
  );
}

/** A titled block. Every section in every drawer uses this — that's the visual glue. */
export function Section({
  title,
  action,
  children,
  className = '',
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`px-6 py-5 border-b last:border-b-0 ${className}`}>
      <div className="flex items-center justify-between min-h-[28px] mb-3">
        <h3 className="text-base font-semibold text-black">{title}</h3>
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
    <div className="flex flex-col gap-1.5">
      {/* matches the app's Account-settings field-label darkness (gray-dark read too
          light next to it) — kept here as the one shared style every field label in
          Kai settings should use */}
      <span className="text-sm font-medium text-gray-darkest">{label}</span>
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

/** Up to 3 tags per test (Mehdi). Chips match the table's RowTags exactly; each has a
 *  remove ×, plus a dashed "Add" chip that turns into an inline input. A plain chip row
 *  (not an antd tags-Select) so the height doesn't jump while editing. */
export function TagEditor({
  value = [],
  onChange,
}: {
  value?: string[];
  onChange: (tags: string[]) => void;
}) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const canAdd = value.length < 3;

  const commit = () => {
    const v = draft.trim();
    if (v && !value.includes(v) && value.length < 3) onChange([...value, v]);
    setDraft('');
    setAdding(false);
  };

  const chip =
    'inline-flex items-center text-sm rounded-md border bg-gray-lightest text-gray-dark';
  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((tag) => (
        <span
          key={tag}
          className={`${chip} pl-3 pr-2 py-1`}
          style={{ borderColor: 'var(--color-gray-light)' }}
        >
          {tag}
          <button
            type="button"
            aria-label={t('Remove tag')}
            onClick={() => onChange(value.filter((x) => x !== tag))}
            className="ml-1.5 text-disabled-text hover:text-gray-dark"
          >
            <X size={14} />
          </button>
        </span>
      ))}

      {canAdd &&
        (adding ? (
          <input
            autoFocus
            value={draft}
            placeholder={t('Tag')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setDraft('');
                setAdding(false);
              }
            }}
            className="text-sm px-3 py-1 rounded-md border outline-none w-32"
            style={{ borderColor: 'var(--color-gray-light)' }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`${chip} gap-1.5 px-3 py-1 border-dashed text-disabled-text hover:text-gray-dark`}
            style={{ borderColor: 'var(--color-gray-light)' }}
          >
            <Plus size={14} /> {t('Add')}
          </button>
        ))}
    </div>
  );
}
