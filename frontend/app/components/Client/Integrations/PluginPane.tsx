import { ExternalLink } from '@/ui/actions/ExternalLink';
import { SimpleSelect } from '@/ui/inputs/select';
import { DrawerHeader, Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';

import '../preferences.css';

/** The project whose key a plugin's snippets carry, picked in the drawer. */
export function usePluginProject() {
  const { projectsStore, integrationsStore } = useStore();
  const projects = projectsStore.list;
  const [projectId, setProjectId] = React.useState(() =>
    String(
      integrationsStore.integrations.siteId || projects[0]?.projectId || '',
    ),
  );
  const project =
    projects.find((p) => String(p.projectId) === projectId) ?? projects[0];
  return {
    projectId: project ? String(project.projectId) : projectId,
    setProjectId,
    projectKey: project?.projectKey ?? '',
  };
}

interface Props {
  title: string;
  icon: string;
  blurb: ReactNode;
  docs: string;
  scope: ReturnType<typeof usePluginProject>;
  /** Install and Use sections */
  children: ReactNode;
  onClose?: () => void;
}

/** A tracker plugin's side panel: what it captures, how to install and use it. */
export const PluginPane = observer(function PluginPane({
  title,
  icon,
  blurb,
  docs,
  scope,
  children,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { projectsStore } = useStore();
  const projects = projectsStore.list;
  return (
    <div className="m-drawer__pane">
      <header className="m-drawer__head">
        <span className="m-pref__card-mark m-int__mark" aria-hidden="true">
          <img src={`/assets/${icon}.svg`} alt="" width={20} height={20} />
        </span>
        <DrawerHeader
          eyebrow={t('Plugin')}
          title={title}
          actions={
            projects.length > 1 ? (
              <SimpleSelect<string>
                value={scope.projectId}
                ariaLabel={t('Project')}
                onChange={(v) => v && scope.setProjectId(v)}
                options={projects.map((p) => ({
                  value: String(p.projectId),
                  label: p.name,
                }))}
                className="m-pref__w-md"
              />
            ) : undefined
          }
          onClose={onClose ?? hideModal}
        />
      </header>
      <div className="m-drawer__body">
        <Section title={t('What it captures')}>
          <p className="m-int__blurb">{blurb}</p>
        </Section>
        {children}
        <Section title={t('Docs')}>
          <ExternalLink className="m-int__docs" href={docs}>
            {t('{{name}} on docs.openreplay.com', { name: title })}
          </ExternalLink>
        </Section>
      </div>
    </div>
  );
});
