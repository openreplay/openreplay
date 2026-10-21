import { Illustration } from '@/ui/illustrations/Illustration';
import { stateById, stateByTitle } from '@/ui/illustrations/states';
import { SUBJECTS, type SubjectKind } from '@/ui/illustrations/subjects';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyArt, type EmptyArtVariant } from './EmptyArt';
import './empty-state.css';

export interface EmptyStateProps {
  title: string;

  hint?: ReactNode;
  action?: ReactNode;

  /** the old line drawing, for a state the library has no entry for */
  art?: EmptyArtVariant;
  /** the library entry to draw (`ui/illustrations/states`); else found by title */
  state?: string;
  /** a drawing of the caller's own; makes the state a page's */
  illustration?: ReactNode;

  badge?: ReactNode;

  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  hint,
  action,
  art,
  state,
  illustration,
  badge,
  children,
  className,
}: EmptyStateProps) {
  const { t, i18n } = useTranslation();
  const entry = state
    ? stateById(state)
    : (stateByTitle(title, (s) => t(s), i18n.language) ??
      (/\bmatch(es)?\b/i.test(title)
        ? stateById('search-nomatch')
        : undefined));
  const drawn =
    illustration ??
    (entry && entry.subject in SUBJECTS ? (
      <Illustration
        subject={entry.subject as SubjectKind}
        robot={entry.robot !== false}
        prop={entry.prop}
        pose={entry.pose}
        side={entry.side}
        aura={entry.aura ?? true}
        size={entry.size}
        width={entry.size === 'page' ? 220 : 132}
        variant={entry.id}
      />
    ) : null);
  const page =
    drawn != null
      ? illustration != null || entry?.size === 'page'
      : art != null;
  return (
    <div
      className={`m-empty${page ? ' m-empty--page' : ''}${drawn && !page ? ' m-empty--drawn' : ''}${className ? ` ${className}` : ''}`}
    >
      {drawn ? (
        <div className="m-empty__illustration">{drawn}</div>
      ) : (
        art && <EmptyArt variant={art} />
      )}
      {badge && <div className="m-empty__badge">{badge}</div>}
      <p className="m-empty__title">{title}</p>
      {hint && <p className="m-empty__hint">{hint}</p>}
      {children && <div className="m-empty__body">{children}</div>}
      {action && <div className="m-empty__action">{action}</div>}
    </div>
  );
}
