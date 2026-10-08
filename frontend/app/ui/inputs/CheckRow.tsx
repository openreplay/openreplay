import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import './check-row.css';

export interface CheckRowProps {
  on: boolean;
  onToggle: () => void;
  children: ReactNode;

  meta?: ReactNode;

  icon?: ReactNode;

  single?: boolean;

  hint?: ReactNode;
  /** In a form: the box is drawn at rest (a menu row only shows it on hover). */
  boxed?: boolean;

  disabled?: boolean;
}

export function CheckRow({
  on,
  onToggle,
  children,
  meta,
  icon,
  single,
  hint,
  boxed,
  disabled,
}: CheckRowProps) {
  return (
    <button
      type="button"
      role={boxed ? 'checkbox' : single ? 'menuitemradio' : 'menuitemcheckbox'}
      aria-checked={on}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      className={`m-checkrow${on ? ' m-checkrow--on' : ''}${single ? ' m-checkrow--single' : ''}${hint != null ? ' m-checkrow--hinted' : ''}${boxed ? ' m-checkrow--boxed' : ''}`}
      onClick={onToggle}
    >
      <span className="m-checkrow__box" aria-hidden="true">
        {on && <Check className="m-mark" size={11} strokeWidth={3} />}
      </span>
      {icon != null && (
        <span className="m-checkrow__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {hint != null ? (
        <span className="m-checkrow__lead">
          <span className="m-checkrow__label">{children}</span>
          <span className="m-checkrow__hint">{hint}</span>
        </span>
      ) : (
        <span className="m-checkrow__label m-truncate">{children}</span>
      )}
      {meta != null && <span className="m-checkrow__meta">{meta}</span>}
    </button>
  );
}
