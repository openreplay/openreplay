import { ExternalLink } from '@/ui/actions/ExternalLink';
import { Icon } from '@/ui/icons/Icon';
import { DrawerHeader, Section } from '@/ui/overlays/EntityDrawer';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import '../preferences.css';

export interface IntegrationPaneProps {
  /** the card group it sits in, said over the name */
  category: string;
  title: string;
  icon: string;
  useIcon?: boolean;
  /** what this one does that its neighbours don't */
  blurb: ReactNode;
  docs: string;
  /** the fields it needs to connect */
  children: ReactNode;
  /** which projects the connection covers */
  projects: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}

/** One integration's side panel: what it does, its credentials, its projects. */
export function IntegrationPane({
  category,
  title,
  icon,
  useIcon,
  blurb,
  docs,
  children,
  projects,
  footer,
  onClose,
}: IntegrationPaneProps) {
  const { t } = useTranslation();
  return (
    <div className="m-drawer__pane">
      <header className="m-drawer__head">
        <span className="m-pref__card-mark m-int__mark" aria-hidden="true">
          {useIcon ? (
            <Icon name={icon as any} size={20} />
          ) : (
            <img src={`/assets/${icon}.svg`} alt="" width={20} height={20} />
          )}
        </span>
        <DrawerHeader eyebrow={category} title={title} onClose={onClose} />
      </header>
      <div className="m-drawer__body">
        <Section title={t('What it does')}>
          <p className="m-int__blurb">{blurb}</p>
          <ExternalLink className="m-int__docs" href={docs}>
            {t('How to get these values')}
          </ExternalLink>
        </Section>
        <Section
          title={t('Credentials')}
          hint={t(
            'Stored by OpenReplay and used on your behalf. Nothing here is shown to your users.',
          )}
        >
          <div className="m-int__fields">{children}</div>
        </Section>
        <Section
          title={t('Projects')}
          hint={t('Which projects this connection covers.')}
        >
          {projects}
        </Section>
      </div>
      <footer className="m-drawer__foot">{footer}</footer>
    </div>
  );
}
