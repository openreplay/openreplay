import { IconButton } from '@/ui/actions/IconButton';
import { EditableTitle } from '@/ui/inputs/EditableTitle';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
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
  /** px; overrides `size` for content laid out at a fixed width */
  width?: number;
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
  width,
  children,
}: EntityDrawerProps) {
  const { t } = useTranslation();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      label={title || namePlaceholder || t('Panel')}
      size={size}
      width={width}
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
                heading={(text) => <h2 className="m-drawer__title">{text}</h2>}
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
  htmlFor,
  children,
}: {
  label: ReactNode;
  /** shown under the control while the value can't be saved */
  error?: ReactNode;
  /** the control's id, when wrapping alone doesn't name it */
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label className="m-dfield" htmlFor={htmlFor}>
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
