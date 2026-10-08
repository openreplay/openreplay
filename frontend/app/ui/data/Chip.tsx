import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import './chip.css';

export type ChipTone = 'neutral' | 'danger' | 'warning' | 'success' | 'info';

export interface ChipProps {
  children: ReactNode;

  tone?: ChipTone;

  kind?: 'tag' | 'status';

  iconOnly?: boolean;
  title?: string;

  onRemove?: () => void;

  removeLabel?: string;
}

export function Chip({
  children,
  tone = 'neutral',
  kind = 'tag',
  iconOnly = false,
  title,
  onRemove,
  removeLabel,
}: ChipProps) {
  return (
    <span
      className={`m-chip m-chip--${tone} m-chip--${kind}${iconOnly ? ' m-chip--icon' : ''}${
        onRemove ? ' m-chip--removable' : ''
      }`}
      title={title}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          className="m-chip__x"
          aria-label={removeLabel ?? 'Remove'}
          onClick={onRemove}
        >
          <X size={11} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
