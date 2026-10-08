import Project from '@/mstore/types/project';
import { PopoverPanel } from '@/ui/overlays/popover';
import { Globe, Plus, Settings2, Smartphone } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useModal } from 'Components/ModalContext';

import { NavItem } from './NavItem';
import './account-menu.css';

const ProjectForm = React.lazy(
  () => import('Components/Client/Projects/ProjectForm'),
);

export function useSwitchProject() {
  const mstore = useStore();
  const { projectsStore, searchStore, searchStoreLive, aiFiltersStore } =
    mstore;
  return (siteId: string) => {
    mstore.initClient();
    aiFiltersStore.clearFilters();
    projectsStore.setSiteId(siteId);
    searchStore.clearSearch();
    searchStore.clearList();
    searchStoreLive.clearSearch();
  };
}

interface AccountMenuProps {
  onPreferences: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactElement;
}

function AccountMenu({
  onPreferences,
  open,
  onOpenChange,
  children,
}: AccountMenuProps) {
  const { t } = useTranslation();
  const { projectsStore, userStore } = useStore();
  const { openModal, closeModal } = useModal();
  const switchProject = useSwitchProject();
  const { account } = userStore;
  const isAdmin = account.admin || account.superAdmin;
  const sites = projectsStore.list;
  const org = account.tenantName || account.name;

  const addProject = () => {
    projectsStore.initProject({});
    openModal(
      <React.Suspense fallback={null}>
        <ProjectForm
          onClose={(p: Project | null) => {
            closeModal();
            if (p?.projectId) switchProject(p.projectId.toString());
          }}
        />
      </React.Suspense>,
      { title: t('New Project') },
    );
  };

  const card = (
    <div className="m-account-menu">
      <div className="m-account-menu__head">
        <span className="m-nav__account-badge" aria-hidden="true">
          {org.charAt(0).toUpperCase()}
        </span>
        <span className="m-nav__account-text">
          <span className="m-nav__account-name m-truncate">{org}</span>
          <span className="m-nav__account-org m-truncate">
            {t('{{count}} projects', { count: sites.length })}
          </span>
        </span>
      </div>

      <div
        className="m-account-menu__group max-h-[50vh] overflow-y-auto"
        role="group"
        aria-label={t('Projects')}
      >
        {sites.map((p) => (
          <NavItem
            key={p.id ?? p.host}
            nested
            icon={
              p.platform === 'web' ? (
                <Globe size={13} />
              ) : (
                <Smartphone size={13} />
              )
            }
            label={p.host}
            active={p.id === projectsStore.siteId}
            onClick={() => {
              if (p.id) switchProject(p.id);
              onOpenChange(false);
            }}
          />
        ))}
      </div>

      <div className="m-account-menu__group">
        {isAdmin && (
          <NavItem
            icon={<Plus size={15} />}
            label={t('New project')}
            onClick={() => {
              addProject();
              onOpenChange(false);
            }}
          />
        )}
        <NavItem
          icon={<Settings2 size={15} />}
          label={t('Preferences')}
          onClick={() => {
            onPreferences();
            onOpenChange(false);
          }}
        />
      </div>
    </div>
  );

  return (
    <PopoverPanel
      content={card}
      open={open}
      onOpenChange={onOpenChange}
      placement="bottomLeft"
      className="m-account-root"
      sideOffset={4}
    >
      {children}
    </PopoverPanel>
  );
}

export default observer(AccountMenu);
