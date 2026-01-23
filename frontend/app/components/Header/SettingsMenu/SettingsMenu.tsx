import React from 'react';
import { Icon } from 'UI';
import { withRouter, RouteComponentProps } from 'react-router';
import { useTranslation } from 'react-i18next';
import { pathNavigate, extraAdminItems } from './utils';

interface Props {
  history: any;
  className: string;
  account: any;
}

function SettingsMenu(props: RouteComponentProps<Props>) {
  const { t } = useTranslation();
  const { history, account, className }: any = props;
  const isAdmin = account.admin || account.superAdmin;
  const isEnterprise = account.edition === 'ee';
  const navigateTo = (path: any) => {
    pathNavigate(history, path);
  };
  return (
    <div>
      <MenuItem
        onClick={() => navigateTo('sessions-listing')}
        label={t('Sessions Listing')}
        icon="folder2"
      />
      <MenuItem
        onClick={() => navigateTo('integrations')}
        label={t('Integrations')}
        icon="puzzle"
      />
      <MenuItem
        onClick={() => navigateTo('metadata')}
        label={t('Metadata')}
        icon="tags"
      />
      <MenuItem
        onClick={() => navigateTo('webhooks')}
        label={t('Webhooks')}
        icon="link-45deg"
      />
      <MenuItem
        onClick={() => navigateTo('projects')}
        label={t('Projects')}
        icon="folder2"
      />
      {isAdmin && (
        <MenuItem
          onClick={() => navigateTo('team')}
          label={t('Team')}
          icon="users"
        />
      )}
      {isEnterprise && isAdmin && (
        <>
          <MenuItem
            onClick={() => navigateTo('roles')}
            label={t('Roles & Access')}
            icon="diagram-3"
          />
          <MenuItem
            onClick={() => navigateTo('audit')}
            label={t('Audit')}
            icon="list-ul"
          />
          {extraAdminItems.map((item: any) => (
            <MenuItem
              key={item.label}
              onClick={() => navigateTo(item.path)}
              label={t(item.label)}
              icon={item.icon}
            />
          ))}
        </>
      )}
      <MenuItem
        onClick={() => navigateTo('notifications')}
        label={t('Notifications')}
        icon="bell-slash"
      />
    </div>
  );
}

export default withRouter(SettingsMenu);

function MenuItem({ onClick, label, icon }: any) {
  return (
    <div
      className="rounded-sm border border-transparent p-2 cursor-pointer flex items-center hover:bg-active-blue hover:border-active-blue-border! hover-teal"
      onClick={onClick}
    >
      <Icon name={icon} size="16" />
      <button className="ml-2">{label}</button>
    </div>
  );
}
