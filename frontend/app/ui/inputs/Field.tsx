import { type ReactNode, useId } from 'react';

import './field.css';

export interface FieldProps {
  label: ReactNode;

  note?: ReactNode;

  error?: ReactNode;

  htmlFor?: string;

  aside?: ReactNode;
  children:
    | ReactNode
    | ((id: string, describedBy: string | undefined) => ReactNode);
}

export function Field({
  label,
  note,
  error,
  htmlFor,
  aside,
  children,
}: FieldProps) {
  const gen = useId();
  const id = htmlFor ?? `m-field-${gen}`;
  const under = error ?? note;
  const describedBy = under ? `${id}-note` : undefined;
  return (
    <div className={`m-field${error ? ' is-invalid' : ''}`} data-slot="field">
      <div className="m-field__head">
        <label className="m-field__label" htmlFor={id}>
          {label}
        </label>
        {aside && <span className="m-field__aside">{aside}</span>}
      </div>
      {typeof children === 'function' ? children(id, describedBy) : children}
      {under && (
        <p
          className={`m-field__note${error ? ' is-error' : ''}`}
          id={`${id}-note`}
          role={error ? 'alert' : undefined}
        >
          {under}
        </p>
      )}
    </div>
  );
}
