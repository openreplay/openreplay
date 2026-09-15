import { MENU } from 'App/layout/data';

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
  [MENU.HIGHLIGHTS]: () => import('Components/Highlights/HighlightsList'),
  [MENU.ACTIVITY]: () =>
    import('Components/DataManagement/Activity/ActivityPage'),
  [MENU.USERS]: () =>
    import('Components/DataManagement/UsersEvents/UsersListPage'),
  [MENU.EVENTS]: () => import('Components/DataManagement/Events/index'),
  [MENU.PROPS]: () => import('Components/DataManagement/Properties/ListPage'),
  [MENU.SEGMENTS]: () => import('Components/DataManagement/Segments/index'),
  [MENU.TAGS]: () => import('Components/DataManagement/Tags/index'),
};

const started = new Set<string>();

export function prefetchRoute(key: string): void {
  const load = loaders[key];
  if (!load || started.has(key)) return;
  started.add(key);
  // React.lazy retries and reports properly if the user actually navigates.
  void load().catch(() => started.delete(key));
}

export default prefetchRoute;
