import { MENU } from 'App/layout/data';

/**
 * Every private route is `lazy()`, so clicking a menu item starts a cold chunk
 * fetch and shows a spinner until it lands. Hovering is a strong signal the
 * route is about to be opened, and the ~150ms between hover and click is
 * usually enough to cover the request.
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

/** Keys already requested — the browser caches the chunk, this just avoids churn. */
const started = new Set<string>();

export function prefetchRoute(key: string): void {
  const load = loaders[key];
  if (!load || started.has(key)) return;
  started.add(key);
  // A failed prefetch is not an error worth surfacing: React.lazy will retry
  // and report properly if the user actually navigates there.
  void load().catch(() => started.delete(key));
}

export default prefetchRoute;
