import { MENU, PREFERENCES_MENU } from 'App/layout/data';
import * as routes from 'App/routes';
import {
  CLIENT_DEFAULT_TAB,
  CLIENT_TABS,
  client,
  withSiteId,
} from 'App/routes';

import { extraRoutes } from '../menuRoutes';

export function menuRoutes(
  siteId: string | null,
): Record<string, () => string> {
  const site = (path: string) => withSiteId(path, siteId);
  return {
    [MENU.EXIT]: () => site(routes.sessions()),
    [MENU.SESSIONS]: () => site(routes.sessions()),
    [MENU.BOOKMARKS]: () => site(routes.bookmarks()),
    [MENU.VAULT]: () => site(routes.bookmarks()),
    [MENU.LIVE_SESSIONS]: () => site(routes.assist()),
    [MENU.DASHBOARDS]: () => site(routes.dashboard()),
    [MENU.CARDS]: () => site(routes.metrics()),
    [MENU.ALERTS]: () => site(routes.alerts()),
    [MENU.PREFERENCES]: () => client(CLIENT_DEFAULT_TAB),
    [MENU.SPOTS]: () => site(routes.spotsList()),
    [MENU.ACTIVITY]: () => site(routes.dataManagement.activity()),
    [MENU.USERS]: () => site(routes.dataManagement.usersList()),
    [MENU.EVENTS]: () => site(routes.dataManagement.eventsList()),
    [MENU.PROPS]: () => site(routes.dataManagement.properties()),
    [MENU.SEGMENTS]: () => site(routes.dataManagement.segments()),
    [MENU.TAGS]: () => site(routes.dataManagement.tags()),
    [PREFERENCES_MENU.ACCOUNT]: () => client(CLIENT_TABS.PROFILE),
    [PREFERENCES_MENU.SESSION_SETTINGS]: () =>
      client(CLIENT_TABS.SESSION_SETTINGS),
    [PREFERENCES_MENU.INTEGRATIONS]: () => client(CLIENT_TABS.INTEGRATIONS),
    [PREFERENCES_MENU.WEBHOOKS]: () => client(CLIENT_TABS.WEBHOOKS),
    [PREFERENCES_MENU.PROJECTS]: () => client(CLIENT_TABS.SITES),
    [PREFERENCES_MENU.ROLES_ACCESS]: () => client(CLIENT_TABS.MANAGE_ROLES),
    [PREFERENCES_MENU.AUDIT]: () => client(CLIENT_TABS.AUDIT),
    [PREFERENCES_MENU.AGENTS]: () => client(CLIENT_TABS.AGENTS),
    [PREFERENCES_MENU.TEAM]: () => client(CLIENT_TABS.MANAGE_USERS),
    [PREFERENCES_MENU.BILLING]: () => client(CLIENT_TABS.BILLING),
    [PREFERENCES_MENU.EXPORTED_VIDEOS]: () => client(CLIENT_TABS.VIDEOS),
    [PREFERENCES_MENU.TEST_AGENTS]: () => client(CLIENT_TABS.TEST_AGENTS),
    ...extraRoutes(siteId),
  };
}

const stripQuery = (path: string) => path.split('?')[0];

/** Pages outside the menu that belong to a menu item. */
export function menuAliases(
  siteId: string | null,
): Record<string, () => string> {
  const site = (path: string) => withSiteId(path, siteId);
  return {
    [MENU.USERS]: () => site(routes.dataManagement.userPage('')),
  };
}

/** The menu key whose route is the longest prefix of `pathname`. */
export function activeMenuKey(
  pathname: string,
  table: Record<string, () => string>,
  aliases: Record<string, () => string> = {},
): string | undefined {
  let best: string | undefined;
  let bestLen = 0;
  for (const [key, route] of [
    ...Object.entries(table),
    ...Object.entries(aliases),
  ]) {
    if (key === MENU.EXIT || key === MENU.PREFERENCES) continue;
    const path = stripQuery(route());
    const hit =
      pathname === path ||
      pathname.startsWith(path.endsWith('/') ? path : `${path}/`);
    if (hit && path.length > bestLen) {
      best = key;
      bestLen = path.length;
    }
  }
  return best;
}
