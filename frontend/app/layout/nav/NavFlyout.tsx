import { Popover, PopoverAnchor, PopoverContent } from '@/ui/overlays/popover';
import { Tooltip } from '@/ui/overlays/tooltip';
import { type ReactElement, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NavItem } from './NavItem';
import './nav-flyout.css';
import type { NavEntry } from './tree';

export interface NavFlyoutProps {
  enabled: boolean;
  label: string;
  count?: number;

  countNoun?: string;
  badge?: string;

  sections?: readonly NavEntry[];

  active?: string;
  onNavigate?: (key: string) => void;

  children: ReactElement;
}

export function NavFlyout({
  enabled,
  label,
  count = 0,
  countNoun,
  badge,
  sections,
  active,
  onNavigate,
  children,
}: NavFlyoutProps) {
  const { t } = useTranslation();
  if (!enabled) return children;

  if (!sections) {
    return (
      <Tooltip
        title={
          count > 0 ? `${label} · ${count} ${countNoun ?? t('open')}` : label
        }
        side="right"
      >
        {children}
      </Tooltip>
    );
  }

  return (
    <SectionFlyout
      label={label}
      count={count}
      badge={badge}
      sections={sections}
      active={active}
      onNavigate={onNavigate}
    >
      {children}
    </SectionFlyout>
  );
}

function SectionFlyout({
  label,
  count = 0,
  badge,
  sections,
  active,
  onNavigate,
  children,
}: Omit<NavFlyoutProps, 'enabled'>) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const openAfter = (ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), ms);
  };
  const closeAfter = (ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), ms);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          onMouseEnter={() => openAfter(220)}
          onMouseLeave={() => closeAfter(240)}
          onFocusCapture={() => setOpen(true)}
          onBlurCapture={() => closeAfter(240)}
        >
          {children}
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={-6}
        alignOffset={-3}
        className="m-flyout-root border-0 bg-transparent p-0 shadow-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={() => window.clearTimeout(timer.current)}
        onMouseLeave={() => closeAfter(240)}
      >
        <div className="m-flyout">
          <div className="m-flyout__head">
            <span className="m-flyout__name m-truncate">{label}</span>
            {badge && <span className="m-nav-item__badge">{badge}</span>}
            {count > 0 && <span className="m-flyout__count">{count}</span>}
          </div>
          <div className="m-flyout__sections">
            {sections?.map((s) => (
              <NavItem
                key={s.key}
                nested
                label={s.label}
                count={s.count}
                badge={s.badge}
                active={
                  active === s.key || (active?.startsWith(`${s.key}/`) ?? false)
                }
                onClick={() => onNavigate?.(s.key)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
