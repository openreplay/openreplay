import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import './nav-item.css';

export interface NavItemProps {
  icon?: ReactNode;
  label: string;

  count?: number;

  badge?: string;

  active?: boolean;

  nested?: boolean;

  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

export function NavItem({
  icon,
  label,
  count = 0,
  badge,
  active,
  nested,
  expandable,
  expanded,
  onToggle,
  onClick,
}: NavItemProps) {
  // the caret can't be a button inside this one: keyboard users toggle the
  // subitems with the arrow keys, as in a tree
  return (
    <button
      type="button"
      className={`m-nav-item${active ? ' is-active' : ''}${nested ? ' is-nested' : ''}`}
      aria-current={active ? 'page' : undefined}
      aria-expanded={expandable ? !!expanded : undefined}
      onClick={onClick}
      onKeyDown={
        expandable
          ? (e) => {
              if (
                (e.key === 'ArrowRight' && !expanded) ||
                (e.key === 'ArrowLeft' && expanded)
              ) {
                e.preventDefault();
                // the player seeks on bare arrows too
                e.stopPropagation();
                onToggle?.();
              }
            }
          : undefined
      }
    >
      {icon && (
        <span className="m-nav-item__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="m-nav-item__label m-truncate">{label}</span>
      {badge && <span className="m-nav-item__badge">{badge}</span>}

      {count > 0 && (
        <span className="m-nav-item__count">
          <span className="m-dot" aria-hidden="true" />

          <span className="m-nav-item__num">{count > 99 ? '99+' : count}</span>
        </span>
      )}
      {expandable ? (
        <span
          className={`m-nav-item__caret${expanded ? ' is-open' : ''}`}
          aria-hidden="true"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          <ChevronRight size={13} />
        </span>
      ) : (
        <span className="m-nav-item__caret is-empty" aria-hidden="true" />
      )}
    </button>
  );
}
