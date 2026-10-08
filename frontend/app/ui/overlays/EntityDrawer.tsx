import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Input } from '@/ui/inputs/input';
import { Pencil, X } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Drawer, type DrawerSize } from './drawer';
import './entity-drawer.css';

export interface EntityDrawerProps {
  open: boolean;
  onClose: () => void;

  title: string;

  eyebrow?: ReactNode;
  onTitleChange?: (title: string) => void;

  autoEditTitle?: boolean;

  namePlaceholder?: string;

  meta?: ReactNode;

  headerActions?: ReactNode;
  footer?: ReactNode;

  size?: DrawerSize;
  children: ReactNode;
}

export function EntityDrawer({
  open,
  onClose,
  title,
  eyebrow,
  onTitleChange,
  autoEditTitle,
  namePlaceholder,
  meta,
  headerActions,
  footer,
  size,
  children,
}: EntityDrawerProps) {
  const { t } = useTranslation();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      label={title || namePlaceholder || t('Panel')}
      size={size}
      header={
        <DrawerHeader
          eyebrow={eyebrow}
          title={
            onTitleChange ? (
              <EditableTitle
                title={title}
                onChange={onTitleChange}
                autoEdit={autoEditTitle}
                placeholder={namePlaceholder}
              />
            ) : (
              title
            )
          }
          meta={meta}
          actions={headerActions}
          onClose={onClose}
        />
      }
      footer={footer}
    >
      {children}
    </Drawer>
  );
}

/** The drawer's head row, for content that renders inside a bare `Drawer`. Wrap it in
    `.m-drawer__head` when it is not passed as the drawer's `header`. */
export function DrawerHeader({
  eyebrow,
  title,
  meta,
  actions,
  onClose,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="m-drawer__lead">
        {eyebrow && <p className="m-drawer__eyebrow">{eyebrow}</p>}
        {typeof title === 'string' ? (
          <h2 className="m-drawer__title">{title}</h2>
        ) : (
          title
        )}
        {meta && <div className="m-drawer__meta">{meta}</div>}
      </div>
      <div className="m-drawer__actions">
        {actions}
        {actions && <span className="m-drawer__sep" aria-hidden="true" />}
        <IconButton
          icon={<X size={15} />}
          label={t('Close')}
          variant="ghost"
          onClick={onClose}
        />
      </div>
    </>
  );
}

function EditableTitle({
  title,
  onChange,
  autoEdit,
  placeholder,
}: {
  title: string;
  onChange: (title: string) => void;
  autoEdit?: boolean;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(!!autoEdit);
  const [val, setVal] = useState(autoEdit ? '' : title);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setVal(title);
  }, [title, editing]);

  useEffect(() => {
    if (!editing) return undefined;
    const id = window.setTimeout(() => ref.current?.focus(), autoEdit ? 80 : 0);
    return () => window.clearTimeout(id);
  }, [editing, autoEdit]);

  const commit = () => {
    const v = val.trim();
    if (v && v !== title) onChange(v);
    else setVal(title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="m-drawer__rename">
        <Input
          ref={ref}
          value={val}
          maxLength={120}
          aria-label={t('Name')}
          placeholder={autoEdit ? (placeholder ?? t('Name')) : undefined}
          onChange={(e) => {
            setVal(e.target.value);

            if (autoEdit) onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();

            if (e.key === 'Escape') {
              e.stopPropagation();
              setVal(title);
              setEditing(false);
            }
          }}
        />

        {!autoEdit && (
          <>
            <Button
              variant="subtle"
              onClick={() => {
                setVal(title);
                setEditing(false);
              }}
            >
              {t('Cancel')}
            </Button>
            <Button variant="primary" onClick={commit}>
              {t('Save')}
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="m-drawer__title-btn"
      onClick={() => setEditing(true)}
      aria-label={t('Rename {{title}}', { title })}
    >
      <h2 className="m-drawer__title">{title}</h2>
      <Pencil size={13} aria-hidden="true" />
    </button>
  );
}

export function Section({
  title,
  action,
  hint,
  flush,
  children,
}: {
  title: ReactNode;

  action?: ReactNode;

  hint?: ReactNode;

  flush?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`m-dsec${flush ? ' is-flush' : ''}`}>
      <div className="m-dsec__head">
        <h3 className="m-dsec__title">{title}</h3>
        {action}
      </div>
      {hint && <p className="m-dsec__hint">{hint}</p>}
      {children}
    </section>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: ReactNode;
  /** shown under the control while the value can't be saved */
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="m-dfield">
      <span className="m-dfield__label">{label}</span>
      {children}
      {error ? (
        <span className="m-dfield__error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function MetaGrid({
  items,
}: {
  items: { label: ReactNode; value: ReactNode }[];
}) {
  return (
    <dl className="m-dgrid">
      {items.map((it, i) => (
        <div key={i} className="m-dgrid__cell">
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DrawerFooter({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="m-dfoot">
      <div className="m-dfoot__left">{left}</div>
      <div className="m-dfoot__right">{right}</div>
    </div>
  );
}
