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
  const navigateTo = (path: any) => {
    switch (path) {
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
    }
  };
  return (
    <div
      style={{ width: '150px' }}
      className={cn(className, 'absolute right-0 top-0 bg-white border mt-14')}
    >
      {isAdmin && (
        <>
          <MenuItem onClick={() => navigateTo('projects')} label="Projects" icon="folder2" />
          <MenuItem onClick={() => navigateTo('team')} label="Team" icon="users" />
        </>
      )}
      <MenuItem onClick={() => navigateTo('metadata')} label="Metadata" icon="tags" />
      <MenuItem onClick={() => navigateTo('webhooks')} label="Webhooks" icon="link-45deg" />
      <MenuItem onClick={() => navigateTo('integrations')} label="Integrations" icon="puzzle" />
      <MenuItem
        onClick={() => navigateTo('notifications')}
        label="Notifications"
        icon="bell-slash"
      />
    </div>
  );
}

export default withRouter(SettingsMenu);

function MenuItem({ onClick, label, icon }: any) {
  return (
    <div
      className="border-t p-3 cursor-pointer flex items-center hover:bg-active-blue"
      onClick={onClick}
    >
      <Icon name={icon} size="16" />
      <button className="ml-2">{label}</button>
    </div>
  );
}
