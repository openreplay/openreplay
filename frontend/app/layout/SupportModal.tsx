import { SUPPORT_GLYPHS } from '@/ui/brand/support-glyphs';
import { EntityDrawer, Section } from '@/ui/overlays/EntityDrawer';
import { ArrowUpRight } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import 'Shared/SupportMenu/support-menu.css';

import ENV from '../../env';
import CrispIframe from './CrispIframe';

interface Props {
  onClose: () => void;
  open: boolean;
}

function SupportModal({ onClose, open }: Props) {
  const { t } = useTranslation();
  const links = [
    {
      glyph: 'docs' as const,
      label: t('Documentation'),
      hint: t(
        'Deploy, manage and customize OpenReplay through quick starts, tutorials, samples, and guides.',
      ),
      href: 'https://docs.openreplay.com',
    },
    {
      glyph: 'slack' as const,
      label: t('Slack community'),
      hint: t(
        'Ask OpenReplay community and get quick resolution to your questions from 1000+ members.',
      ),
      href: 'https://slack.openreplay.com',
    },
    {
      glyph: 'github' as const,
      label: t('GitHub repository'),
      hint: t(
        'Report issues or request features and get quick updates from our dev team.',
      ),
      href: 'https://github.com/openreplay/openreplay/issues',
    },
  ];

  return (
    <EntityDrawer open={open} onClose={onClose} title={t('Support')}>
      <Section title={t('Get help')}>
        <nav
          className="m-support__list"
          style={{ width: '100%' }}
          aria-label={t('Support')}
        >
          {links.map((l) => {
            const g = SUPPORT_GLYPHS[l.glyph];
            return (
              <a
                key={l.href}
                className="m-support__row items-start py-3"
                href={l.href}
                target="_blank"
                rel="noreferrer"
              >
                <svg
                  className="m-support__glyph mt-0.5"
                  viewBox={g.viewBox}
                  aria-hidden="true"
                >
                  <path d={g.d} fill="currentColor" />
                </svg>
                <span className="m-support__text">
                  <span className="m-support__label text-sm">{l.label}</span>
                  <span className="m-support__hint text-xs">{l.hint}</span>
                </span>
                <ArrowUpRight
                  size={13}
                  strokeWidth={1.75}
                  className="m-support__out mt-0.5"
                  aria-hidden="true"
                />
              </a>
            );
          })}
        </nav>
      </Section>
      <CrispIframe WEBSITE_ID={ENV.CRISP_KEY} />
    </EntityDrawer>
  );
}

export default SupportModal;
