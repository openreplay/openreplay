import { NavItem } from './NavItem';
import type { NavEntry } from './tree';

export interface NavSectionsProps {
  items: readonly NavEntry[];

  active: string;
  onNavigate: (key: string) => void;
}

export function NavSections({ items, active, onNavigate }: NavSectionsProps) {
  const isOn = (sub: NavEntry) =>
    active === sub.key || active.startsWith(`${sub.key}/`);

  return (
    <div className="m-nav__sections">
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
    </div>
  );
}
