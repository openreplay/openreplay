import { Popover, PopoverAnchor, PopoverContent } from '@/ui/overlays/popover';
import { Tooltip } from '@/ui/overlays/tooltip';
import { type ReactElement, useLayoutEffect, useRef, useState } from 'react';
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
  badge,
  sections,
  active,
  onNavigate,
  children,
}: Omit<NavFlyoutProps, 'enabled'>) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  // the head's text sits on the hovered glyph's centre line at any density;
  // Radix places the card a frame after mount, so measure once it has
  const anchorRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [nudge, setNudge] = useState(0);
  useLayoutEffect(() => {
    if (!open) return undefined;
    const raf = requestAnimationFrame(() => {
      const a = (
        anchorRef.current?.querySelector('.m-nav-item__icon') ??
        anchorRef.current
      )?.getBoundingClientRect();
      const h = headRef.current?.getBoundingClientRect();
      if (!a || !h) return;
      const d = a.top + a.height / 2 - (h.top + h.height / 2);
      if (Math.abs(d) > 0.5) setNudge((n) => n + d);
    });
    return () => cancelAnimationFrame(raf);
  }, [open, nudge]);

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
          ref={anchorRef}
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
        // the root's left padding bridges the rail and clears it by 8px;
        // -13 lifts the head level with its row: root inset, border, card inset
        sideOffset={0}
        alignOffset={-13 + nudge}
        className="m-flyout-root border-0 bg-transparent p-0 shadow-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={() => window.clearTimeout(timer.current)}
        onMouseLeave={() => closeAfter(240)}
      >
        <div className="m-flyout">
          <div ref={headRef} className="m-flyout__head">
            <span className="m-flyout__name m-truncate">{label}</span>
            {badge && <span className="m-nav-item__badge">{badge}</span>}
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
