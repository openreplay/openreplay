import type { ReactNode } from 'react';

import { EmptyArt, type EmptyArtVariant } from './EmptyArt';
import './empty-state.css';

export interface EmptyStateProps {
  title: string;

  hint?: ReactNode;
  action?: ReactNode;

  art?: EmptyArtVariant;

  badge?: ReactNode;

  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  hint,
  action,
  art,
  badge,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`m-empty${art ? ' m-empty--page' : ''}${className ? ` ${className}` : ''}`}
    >
      {art && <EmptyArt variant={art} />}
      {badge && <div className="m-empty__badge">{badge}</div>}
      <p className="m-empty__title">{title}</p>
      {hint && <p className="m-empty__hint">{hint}</p>}
      {children && <div className="m-empty__body">{children}</div>}
      {action && <div className="m-empty__action">{action}</div>}
    </div>
  );
}
