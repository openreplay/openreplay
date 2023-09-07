import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import { CLIENT_TABS, client as clientRoute } from 'App/routes';
import { withRouter, RouteComponentProps } from 'react-router';

interface Props {
  history: any;
  className: string;
  account: any;
}

function SettingsMenu(props: RouteComponentProps<Props>) {
  const { history, account, className }: any = props;
  const isAdmin = account.admin || account.superAdmin;
  const isEnterprise = account.edition === 'ee';
  const navigateTo = (path: any) => {
    switch (path) {
      case 'sessions-listing':
        return history.push(clientRoute(CLIENT_TABS.SESSIONS_LISTING));
      case 'projects':
        return history.push(clientRoute(CLIENT_TABS.SITES));
      case 'team':
        return history.push(clientRoute(CLIENT_TABS.MANAGE_USERS));
      case 'metadata':
        return history.push(clientRoute(CLIENT_TABS.CUSTOM_FIELDS));
      case 'webhooks':
        return history.push(clientRoute(CLIENT_TABS.WEBHOOKS));
      case 'integrations':
        return history.push(clientRoute(CLIENT_TABS.INTEGRATIONS));
      case 'notifications':
        return history.push(clientRoute(CLIENT_TABS.NOTIFICATIONS));
      case 'roles':
        return history.push(clientRoute(CLIENT_TABS.MANAGE_ROLES));
      case 'audit':
        return history.push(clientRoute(CLIENT_TABS.AUDIT));
    }
  };
  return (
    <div
      // style={{ width: '160px', marginTop: '34px' }}
      // className={cn(className, 'rounded absolute -right-4 top-0 bg-white border p-2 text-left')}
    >
      <MenuItem onClick={() => navigateTo('sessions-listing')} label='Sessions Listing' icon='folder2' />
      <MenuItem onClick={() => navigateTo('integrations')} label='Integrations' icon='puzzle' />
      <MenuItem onClick={() => navigateTo('metadata')} label='Metadata' icon='tags' />
      <MenuItem onClick={() => navigateTo('webhooks')} label='Webhooks' icon='link-45deg' />
      <MenuItem onClick={() => navigateTo('projects')} label='Projects' icon='folder2' />
      {isAdmin && (
        <MenuItem onClick={() => navigateTo('team')} label='Team' icon='users' />
      )}
      {isEnterprise && isAdmin && (
        <>
          <MenuItem onClick={() => navigateTo('roles')} label='Roles & Access' icon='diagram-3' />
          <MenuItem onClick={() => navigateTo('audit')} label='Audit' icon='list-ul' />
        </>
      )}
      <MenuItem
        onClick={() => navigateTo('notifications')}
        label='Notifications'
        icon='bell-slash'
      />
    </div>
  );
}

export default withRouter(SettingsMenu);

function MenuItem({ onClick, label, icon }: any) {
  return (
    <div
      className='rounded border border-transparent p-2 cursor-pointer flex items-center hover:bg-active-blue hover:!border-active-blue-border hover-teal'
      onClick={onClick}
    >
      <Icon name={icon} size='16' />
      <button className='ml-2'>{label}</button>
    </div>
  );
}
