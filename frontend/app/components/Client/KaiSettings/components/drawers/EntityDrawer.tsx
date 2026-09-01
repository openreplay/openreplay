import { EditOutlined } from '@ant-design/icons';
import { Button, Drawer, Input, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import { Plus, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** small uppercase line above the title, e.g. "Test · Paused" */
  eyebrow: string;
  /** when set, the title becomes inline-editable (rename) */
  onTitleChange?: (title: string) => void;
  /** creation flow: mount the title already editing, empty, with a placeholder */
  autoEditTitle?: boolean;
  /** actions rendered top-right in the header, before the close icon */
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/** The shell every drawer in this feature shares, so they read as one family. */
export function EntityDrawer({
  open,
  onClose,
  title,
  eyebrow,
  onTitleChange,
  autoEditTitle,
  headerActions,
  footer,
  children,
}: DrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      rootClassName="kai-entity-drawer"
      placement="right"
      closable
      title={
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-disabled-text">
            {eyebrow}
          </div>
          {onTitleChange ? (
            <EditableTitle
              title={title}
              onChange={onTitleChange}
              autoEdit={autoEditTitle}
            />
          ) : (
            <div className="text-xl font-semibold text-black leading-tight mt-1 break-words">
              {title}
            </div>
          )}
        </div>
      }
      extra={headerActions}
      footer={footer}
      styles={{
        wrapper: { width: 560 },
        body: { padding: 0 },
        // 24px matches the header padding, so the footer's primary button right-aligns
        // with the header actions
        footer: { padding: '12px 24px' },
      }}
    >
      {children}
    </Drawer>
  );
}

/** Click-to-rename title. Enter saves, Escape cancels. `autoEdit` (creation) mounts it
 *  already editing and empty; an empty commit keeps the current title. */
function EditableTitle({
  title,
  onChange,
  autoEdit,
}: {
  title: string;
  onChange: (title: string) => void;
  autoEdit?: boolean;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(!!autoEdit);
  const [val, setVal] = useState(autoEdit ? '' : title);
  const ref = useRef<InputRef>(null);

  // sync to an external title change (render-time, not an effect), but never clobber
  // what the user is currently typing
  const [prevTitle, setPrevTitle] = useState(title);
  if (prevTitle !== title && !editing) {
    setPrevTitle(title);
    setVal(title);
  }

  // on autoEdit, focus only after the drawer animation settles — an early focus gets
  // stolen by the Drawer's own focus management
  useEffect(() => {
    if (!editing) return undefined;
    const id = window.setTimeout(
      () => ref.current?.focus(),
      autoEdit ? 250 : 0,
    );
    return () => window.clearTimeout(id);
  }, [editing, autoEdit]);

  const save = () => {
    const v = val.trim();
    if (v && v !== title) onChange(v);
    else setVal(title);
    setEditing(false);
  };
  const cancel = () => {
    setVal(title);
    setEditing(false);
  };

  // both states share one fixed-height row so toggling edit never grows the header
  if (editing) {
    return (
      <div className="mt-1 h-8 flex items-center gap-2 min-w-0 mr-4">
        <Input
          ref={ref}
          size="small"
          value={val}
          maxLength={120}
          aria-label={t('Test name')}
          placeholder={autoEdit ? t('Name this test') : undefined}
          onChange={(e) => setVal(e.target.value)}
          onPressEnter={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel();
          }}
          className="flex-1 min-w-0"
        />
        <Button size="small" type="text" className="shrink-0" onClick={cancel}>
          {t('Cancel')}
        </Button>
        <Button size="small" type="primary" className="shrink-0" onClick={save}>
          {t('Save')}
        </Button>
      </div>
    );
  }

  return (
    <Tooltip mouseEnterDelay={0.4} title={t('Click to edit')}>
      <div
        onClick={() => setEditing(true)}
        className="group mt-1 h-8 w-fit max-w-full flex items-center gap-2 min-w-0 mr-4 cursor-pointer select-none rounded-lg px-2 -mx-2 hover:bg-teal/10 transition"
      >
        <span className="text-xl font-semibold text-black leading-tight truncate">
          {title}
        </span>
        <span className="shrink-0 text-main opacity-0 group-hover:opacity-100 transition-opacity">
          <EditOutlined />
        </span>
      </div>
    </Tooltip>
  );
}

/** A titled block. Every section in every drawer uses this. */
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

/** Stacked label + control — the one shared field style in this feature. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-darkest">{label}</span>
      {children}
    </div>
  );
}

/** Up to 3 tags per test. A plain chip row (not an antd tags-Select) so the height
 *  doesn't jump while editing. */
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
