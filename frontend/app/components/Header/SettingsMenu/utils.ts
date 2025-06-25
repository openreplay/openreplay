import { CLIENT_TABS, client as clientRoute } from 'App/routes';

export function pathNavigate(history, path) {
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
}

export const extraAdminItems = [];
