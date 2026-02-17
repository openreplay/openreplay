import { CLIENT_TABS, client as clientRoute } from 'App/routes';

export function pathNavigate(navigate: (to: any) => void, path: string) {
  switch (path) {
    case 'sessions-listing':
      return navigate(clientRoute(CLIENT_TABS.SESSION_SETTINGS));
    case 'projects':
      return navigate(clientRoute(CLIENT_TABS.SITES));
    case 'team':
      return navigate(clientRoute(CLIENT_TABS.MANAGE_USERS));
    case 'metadata':
      return navigate(clientRoute(CLIENT_TABS.CUSTOM_FIELDS));
    case 'webhooks':
      return navigate(clientRoute(CLIENT_TABS.WEBHOOKS));
    case 'integrations':
      return navigate(clientRoute(CLIENT_TABS.INTEGRATIONS));
    case 'notifications':
      return navigate(clientRoute(CLIENT_TABS.NOTIFICATIONS));
    case 'roles':
      return navigate(clientRoute(CLIENT_TABS.MANAGE_ROLES));
    case 'audit':
      return navigate(clientRoute(CLIENT_TABS.AUDIT));
  }
}

export const extraAdminItems = [];
