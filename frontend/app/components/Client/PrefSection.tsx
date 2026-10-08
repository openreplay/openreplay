import { CodeBlock } from '@/ui/data/CodeBlock';
import { Switch } from '@/ui/inputs/switch';
import React, { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';

import './preferences.css';

/** A titled block of a preferences section; blocks stack with a hairline between. */
export function PrefBlock({
  title,
  hint,
  actions,
  flush,
  children,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className={`m-pref__block${flush ? ' is-flush' : ''}`}>
      {title || actions ? (
        <div
          className="m-pref__block-head"
          style={
            flush
              ? { padding: 'var(--m-space-6) var(--m-space-7) 0' }
              : undefined
          }
        >
          <div className="m-pref__block-lead">
            {title ? <h3 className="m-pref__block-title">{title}</h3> : null}
            {hint ? <p className="m-pref__block-hint">{hint}</p> : null}
          </div>
          {actions ? (
            <div className="m-pref__block-actions">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children ? (
        <div
          className="m-pref__block-body"
          style={flush ? { gap: 0 } : undefined}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function PrefField({
  label,
  hint,
  note,
  wide,
  htmlFor,
  children,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  note?: ReactNode;
  wide?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className={`m-pref__field${wide ? ' is-wide' : ''}`}>
      {label ? (
        <label className="m-pref__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {hint ? <p className="m-pref__hint">{hint}</p> : null}
      {children}
      {note ? <p className="m-pref__field-note">{note}</p> : null}
    </div>
  );
}

export function PrefToggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <span className="m-pref__toggle">
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
      <label className="m-pref__toggle-label" htmlFor={id}>
        {label}
      </label>
    </span>
  );
}

export function PrefList({ children }: { children: ReactNode }) {
  return <div className="m-pref__list">{children}</div>;
}

export function PrefListRow({
  title,
  sub,
  meta,
  control,
  actions,
  lead,
}: {
  title: ReactNode;
  sub?: ReactNode;
  meta?: ReactNode;
  control?: ReactNode;
  actions?: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <div className="m-pref__list-row">
      {lead}
      <div className="m-pref__list-lead">
        <span className="m-pref__list-title">{title}</span>
        {sub ? <span className="m-pref__list-sub">{sub}</span> : null}
        {control ? <div className="m-pref__list-control">{control}</div> : null}
      </div>
      {meta ? <div className="m-pref__list-meta">{meta}</div> : null}
      {actions ? <div className="m-pref__list-actions">{actions}</div> : null}
    </div>
  );
}

/** A key or token, masked by default, with copy. */
export function SecretValue({
  value,
  secret = true,
  label,
}: {
  value: string;
  secret?: boolean;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <CodeBlock
      inline
      plain
      code={value}
      secret={secret}
      secretLabel={label}
      copyLabel={t('Copy {{label}}', { label })}
    />
  );
}
