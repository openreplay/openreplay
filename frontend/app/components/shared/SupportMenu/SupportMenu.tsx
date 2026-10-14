import { IconButton } from '@/ui/actions/IconButton';
import { SUPPORT_GLYPHS } from '@/ui/brand/support-glyphs';
import { type Placement, PopoverPanel } from '@/ui/overlays/popover';
import { ArrowUpRight, CircleHelp } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './support-menu.css';

/** The "?": docs, issues, community. `children` replaces the trigger. */
export function SupportMenu({
  placement = 'topLeft',
  children,
  extra,
}: {
  placement?: Placement;
  children?: ReactNode;
  /** rows after the three links */
  extra?: (close: () => void) => ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const links = [
    {
      glyph: 'docs' as const,
      label: t('Documentation'),
      hint: 'docs.openreplay.com',
      href: 'https://docs.openreplay.com',
    },
    {
      glyph: 'slack' as const,
      label: t('Slack community'),
      hint: 'slack.openreplay.com',
      href: 'https://slack.openreplay.com',
    },
    {
      glyph: 'github' as const,
      label: t('GitHub repository'),
      hint: 'github.com/openreplay',
      href: 'https://github.com/openreplay/openreplay/issues/new/choose',
    },
  ];
  return (
    <PopoverPanel
      open={open}
      onOpenChange={setOpen}
      placement={placement}
      className="m-support"
      content={
        <nav className="m-support__list" aria-label={t('Support')}>
          {links.map((l) => {
            const g = SUPPORT_GLYPHS[l.glyph];
            return (
              <a
                key={l.href}
                className="m-support__row"
                href={l.href}
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  className="m-support__glyph"
                  viewBox={g.viewBox}
                  aria-hidden="true"
                >
                  <path d={g.d} fill="currentColor" />
                </svg>
                <span className="m-support__text">
                  <span className="m-support__label">{l.label}</span>
                  <span className="m-support__hint">{l.hint}</span>
                </span>
                <ArrowUpRight
                  size={13}
                  strokeWidth={1.75}
                  className="m-support__out"
                  aria-hidden="true"
                />
              </a>
            );
          })}
          {extra?.(() => setOpen(false))}
        </nav>
      }
    >
      {children ?? (
        <span>
          <IconButton
            icon={<CircleHelp size={15} />}
            label={t('Support')}
            variant="ghost"
            open={open}
            onClick={() => setOpen((v) => !v)}
          />
        </span>
      )}
    </PopoverPanel>
  );
}
