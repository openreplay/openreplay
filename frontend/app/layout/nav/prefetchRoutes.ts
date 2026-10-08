import { MENU } from 'App/layout/data';

import { activeMenuKey, menuAliases, menuRoutes } from './routes';

/**
 * Warms the lazy chunk behind a menu item on hover.
 *
 * Paths must match the ones in PrivateRoutes.tsx so both resolve to the same
 * chunk — otherwise this warms a second copy instead of the one the route uses.
 */
const loaders: Record<string, () => Promise<unknown>> = {
  [MENU.SESSIONS]: () => import('Components/Overview'),
  [MENU.VAULT]: () => import('Components/Overview'),
  [MENU.BOOKMARKS]: () => import('Components/Overview'),
  [MENU.RECOMMENDATIONS]: () => import('Components/Overview'),
  [MENU.DASHBOARDS]: () => import('Components/Dashboard/NewDashboard'),
  [MENU.CARDS]: () => import('Components/Dashboard/NewDashboard'),
  [MENU.ALERTS]: () => import('Components/Dashboard/NewDashboard'),
  [MENU.FUNNELS]: () => import('Components/Dashboard/NewDashboard'),
  [MENU.ERROR_TRACKING]: () => import('Components/Dashboard/NewDashboard'),
  [MENU.LIVE_SESSIONS]: () => import('Components/Assist/AssistRouter'),
  [MENU.PREFERENCES]: () => import('Components/Client/Client'),
  [MENU.SPOTS]: () => import('Components/Spots/SpotsList'),
  [MENU.ACTIVITY]: () =>
    import('Components/DataManagement/Activity/ActivityPage'),
  [MENU.USERS]: () =>
    import('Components/DataManagement/UsersEvents/UsersListPage'),
  [MENU.EVENTS]: () => import('Components/DataManagement/Events/index'),
  [MENU.PROPS]: () => import('Components/DataManagement/Properties/ListPage'),
  [MENU.SEGMENTS]: () => import('Components/DataManagement/Segments/index'),
  [MENU.TAGS]: () => import('Components/DataManagement/Tags/index'),
  [MENU.ISSUES]: () => import('Components/SmartAlerts/IssueList/IssuesList'),
  [MENU.TEST_AGENTS]: () =>
    import('Components/Client/SmartTests/StandalonePage'),
  [MENU.AUDITS]: () => import('Saas/audits/AuditsPage'),
};

const started = new Set<string>();

export function prefetchRoute(key: string): void {
  const load = loaders[key];
  if (!load || started.has(key)) return;
  started.add(key);
  // React.lazy retries and reports properly if the user actually navigates.
  void load().catch(() => started.delete(key));
}

/** Pages outside the menu, keyed for prefetchRoute. */
export const PAGE = {
  REPLAY: 'page:replay',
  LIVE: 'page:live',
  SPOT: 'page:spot',
};
loaders[PAGE.REPLAY] = () => import('Components/Session/Session');
loaders[PAGE.LIVE] = () => import('Components/Session/LiveSession');
loaders[PAGE.SPOT] = () => import('Components/Spots/SpotPlayer');

const pagePaths: [RegExp, string][] = [
  [/^\/[^/]+\/session\/[^/]+/, PAGE.REPLAY],
  [/^\/[^/]+\/assist\/[^/]+/, PAGE.LIVE],
  [/^\/view-spot\//, PAGE.SPOT],
];

/**
 * Starts the chunk for the page being opened right at boot, in parallel with
 * the account / projects requests, instead of after them (the routes only
 * mount once both are back).
 */
export function prefetchPath(pathname: string): void {
  const page = pagePaths.find(([re]) => re.test(pathname));
  if (page) {
    prefetchRoute(page[1]);
    return;
  }
  if (pathname.startsWith('/client')) {
    prefetchRoute(MENU.PREFERENCES);
    return;
  }
  const siteId = pathname.split('/')[1] || null;
  const key = activeMenuKey(pathname, menuRoutes(siteId), menuAliases(siteId));
  if (key) prefetchRoute(key);
}

export default prefetchRoute;
