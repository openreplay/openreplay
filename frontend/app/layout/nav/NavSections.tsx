import type { RefObject } from 'react';

import { NavItem } from './NavItem';
import type { NavEntry } from './tree';
import { useRailTorch } from './useRailTorch';

export interface NavSectionsProps {
  items: readonly NavEntry[];

  active: string;
  onNavigate: (key: string) => void;

  light?: string;
}

export function NavSections({
  items,
  active,
  onNavigate,
  light,
}: NavSectionsProps) {
  const rail = useRailTorch<HTMLDivElement>();
  const isOn = (sub: NavEntry) =>
    active === sub.key || active.startsWith(`${sub.key}/`);

  return (
    <div className="m-nav__sections" ref={rail as RefObject<HTMLDivElement>}>
      {items.map((sub) => (
        <NavItem
          key={sub.key}
          nested
          label={sub.label}
          count={sub.count}
          badge={sub.badge}
          active={isOn(sub)}
          onClick={() => onNavigate(sub.key)}
        />
      ))}
      <span
        className="m-lt m-lt--y m-nav__rail-light"
        style={
          light ? ({ '--m-lt-color': light } as React.CSSProperties) : undefined
        }
        aria-hidden="true"
      >
        <span className="m-lt__bloom" />
        <span className="m-lt__core" />
      </span>
    </div>
  );
}
