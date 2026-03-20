import { debounceCall } from '@/utils';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';
import { observer } from 'mobx-react-lite';
import React, { Suspense, lazy } from 'react';

import { GLOBAL_HAS_NO_RECORDINGS } from 'App/constants/storageKeys';
import { OB_DEFAULT_TAB } from 'App/routes';
import {
  Navigate,
  Route,
  StableRoutes,
  useHistory,
  useLocation,
} from 'App/routing';
import { Loader } from 'UI';

import APIClient from './api_client';
import { useStore } from './mstore';
import * as routes from './routes';
import { saasRoutes } from './saasComponents';
import { hasAi } from './utils/split-utils';

const components: any = {
  SessionPure: lazy(() => import('Components/Session/Session')),
  LiveSessionPure: lazy(() => import('Components/Session/LiveSession')),
  OnboardingPure: lazy(() => import('Components/Onboarding/Onboarding')),
  ClientPure: lazy(() => import('Components/Client/Client')),
  AssistPure: lazy(() => import('Components/Assist/AssistRouter')),
  SessionsOverviewPure: lazy(() => import('Components/Overview')),
  DashboardPure: lazy(() => import('Components/Dashboard/NewDashboard')),
  MultiviewPure: lazy(() => import('Components/Session_/Multiview/Multiview')),
  SpotsListPure: lazy(() => import('Components/Spots/SpotsList')),
  SpotPure: lazy(() => import('Components/Spots/SpotPlayer')),
  HighlightsPure: lazy(() => import('Components/Highlights/HighlightsList')),
  KaiPure: lazy(() => import('Components/Kai/KaiChat')),
  ActivityPure: lazy(
    () => import('Components/DataManagement/Activity/ActivityPage'),
  ),
  UserPage: lazy(
    () => import('Components/DataManagement/UsersEvents/UserPage'),
  ),
  UsersPage: lazy(
    () => import('Components/DataManagement/UsersEvents/UsersListPage'),
  ),
  EventsPage: lazy(() => import('Components/DataManagement/Events/index')),
  PropertiesList: lazy(
    () => import('Components/DataManagement/Properties/ListPage'),
  ),
  ActionsPage: lazy(() => import('Components/DataManagement/Actions/index')),
  ActionPage: lazy(
    () => import('Components/DataManagement/Actions/ActionPage'),
  ),
  TagsPage: lazy(() => import('Components/DataManagement/Tags/index')),
};

const enhancedComponents: any = {
  SessionsOverview: withSiteIdUpdater(components.SessionsOverviewPure),
  Dashboard: withSiteIdUpdater(components.DashboardPure),
  Session: withSiteIdUpdater(components.SessionPure),
  LiveSession: withSiteIdUpdater(components.LiveSessionPure),
  Assist: withSiteIdUpdater(components.AssistPure),
  Client: withSiteIdUpdater(components.ClientPure),
  Onboarding: withSiteIdUpdater(components.OnboardingPure),
  Multiview: withSiteIdUpdater(components.MultiviewPure),
  SpotsList: withSiteIdUpdater(components.SpotsListPure),
  Spot: components.SpotPure,
  Highlights: withSiteIdUpdater(components.HighlightsPure),
  Kai: withSiteIdUpdater(components.KaiPure),
  ScopeSetup: components.ScopeSetup,
  Activity: withSiteIdUpdater(components.ActivityPure),
  UserPage: withSiteIdUpdater(components.UserPage),
  UsersPage: withSiteIdUpdater(components.UsersPage),
  EventsPage: withSiteIdUpdater(components.EventsPage),
  PropertiesList: withSiteIdUpdater(components.PropertiesList),
  ActionsPage: withSiteIdUpdater(components.ActionsPage),
  ActionPage: withSiteIdUpdater(components.ActionPage),
  TagsPage: withSiteIdUpdater(components.TagsPage),
};

const { withSiteId } = routes;

const METRICS_PATH = routes.metrics();
const METRICS_DETAILS = routes.metricDetails();
const METRICS_DETAILS_SUB = routes.metricDetailsSub();

const ALERTS_PATH = routes.alerts();
const ALERT_CREATE_PATH = routes.alertCreate();
const ALERT_EDIT_PATH = routes.alertEdit();

const DASHBOARD_PATH = routes.dashboard();
const DASHBOARD_SELECT_PATH = routes.dashboardSelected();
const DASHBOARD_METRIC_CREATE_PATH = routes.dashboardMetricCreate();
const DASHBOARD_METRIC_DETAILS_PATH = routes.dashboardMetricDetails();

const SESSIONS_PATH = routes.sessions();
const NOTES_PATH = routes.notes();
const BOOKMARKS_PATH = routes.bookmarks();
const RECORDINGS_PATH = routes.recordings();
const SESSION_PATH = routes.session();
const CLIENT_PATH = routes.client();
const ONBOARDING_PATH = routes.onboarding();
const ONBOARDING_REDIRECT_PATH = routes.onboarding(OB_DEFAULT_TAB);

const ASSIST_PATH = routes.assist();
const LIVE_SESSION_PATH = routes.liveSession();
const MULTIVIEW_PATH = routes.multiview();
const MULTIVIEW_INDEX_PATH = routes.multiviewIndex();

const SPOTS_LIST_PATH = routes.spotsList();
const SPOT_PATH = routes.spot();

const HIGHLIGHTS_PATH = routes.highlights();
const KAI_PATH = routes.kai();

function PrivateRoutes() {
  const {
    projectsStore,
    userStore,
    integrationsStore,
    searchStore,
    filterStore,
  } = useStore();
  const location = useLocation();
  const history = useHistory();
  const onboarding = userStore.onboarding;
  const { tenantId } = userStore.account;
  const sites = projectsStore.list;
  const { siteId } = projectsStore;
  const hasRecordings = sites.some((s) => s.recorded);
  const redirectToOnboarding =
    !onboarding &&
    (localStorage.getItem(GLOBAL_HAS_NO_RECORDINGS) === 'true' ||
      (sites.length > 0 && !hasRecordings));
  const siteIdList: any = sites.map(({ id }) => id);

  const initialFetchDoneRef = React.useRef(false);
  const [filtersLoaded, setFiltersLoaded] = React.useState(false);

  const IntegrationsRedirect: React.FC = () => {
    const location = useLocation();

    React.useEffect(() => {
      const client = new APIClient();
      switch (location.pathname) {
        case '/integrations/slack':
          client.post('integrations/slack/add', {
            code: location.search.split('=')[1],
            state: tenantId,
          });
          break;
        case '/integrations/msteams':
          client.post('integrations/msteams/add', {
            code: location.search.split('=')[1],
            state: tenantId,
          });
          break;
      }
    }, [location.pathname, location.search]);

    return <Navigate to={CLIENT_PATH} replace />;
  };

  React.useEffect(() => {
    if (!searchStore.urlParsed && filtersLoaded) {
      const searchParams = new URLSearchParams(location.search);
      const searchId = searchParams.get('sid');

      if (searchId) {
        searchStore
          .loadSharedSearch(searchId)
          .then(() => {
            searchParams.delete('sid');
            const newSearch = searchParams.toString();
            const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
            history.replace(newUrl);
            searchStore.setUrlParsed();
            setTimeout(() => {
              initialFetchDoneRef.current = true;
            }, 500);
          })
          .catch((error) => {
            console.error('Failed to load shared search:', error);
            searchStore.setUrlParsed();
            setTimeout(() => {
              initialFetchDoneRef.current = true;
            }, 500);
          });
      } else {
        searchStore.setUrlParsed();
        void searchStore.fetchSessions(true);
        setTimeout(() => {
          initialFetchDoneRef.current = true;
        }, 500);
      }
    }
  }, [filtersLoaded, searchStore.urlParsed, location.search]);

  const debouncedSearchCall = React.useMemo(
    () => debounceCall(() => searchStore.fetchSessions(true), 250),
    [searchStore],
  );
  React.useEffect(() => {
    if (!searchStore.urlParsed || !initialFetchDoneRef.current) return;
    debouncedSearchCall();
  }, [searchStore.instance.filters, searchStore.instance.eventsOrder]);

  React.useEffect(() => {
    const siteId = projectsStore.activeSiteId;
    searchStore.resetTags();
    if (siteId && integrationsStore.integrations.siteId !== siteId) {
      integrationsStore.integrations.setSiteId(siteId);
      void integrationsStore.integrations.fetchIntegrations(siteId);
      filterStore
        .fetchFilters(siteId)
        .then(() => {
          setFiltersLoaded(true);
        })
        .catch((e) => {
          console.error(e);
          // if filters failed, there may be some sessions still available in the list
          void searchStore.fetchSessions(true);
        });
    }
  }, [projectsStore.activeSiteId]);

  const fallbackTo = redirectToOnboarding
    ? withSiteId(ONBOARDING_REDIRECT_PATH, siteId)
    : withSiteId(routes.sessions(), siteId);

  return (
    <Suspense fallback={<Loader loading className="flex-1" />}>
      <StableRoutes>
        <Route
          path={`${CLIENT_PATH}/*`}
          element={<enhancedComponents.Client />}
        />
        <Route
          path={withSiteId(`${ONBOARDING_PATH}/*`, siteIdList)}
          element={<enhancedComponents.Onboarding />}
        />
        <Route
          path={SPOTS_LIST_PATH}
          element={<enhancedComponents.SpotsList />}
        />
        <Route path={SPOT_PATH} element={<enhancedComponents.Spot />} />

        <Route path="/integrations/*" element={<IntegrationsRedirect />} />

        {/* DASHBOARD and Metrics */}
        <Route
          path={withSiteId(`${ALERTS_PATH}/*`, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />
        <Route
          path={withSiteId(`${ALERT_EDIT_PATH}/*`, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />
        <Route
          path={withSiteId(`${ALERT_CREATE_PATH}/*`, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />
        <Route
          path={withSiteId(METRICS_PATH, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />
        <Route
          path={withSiteId(`${METRICS_DETAILS}/*`, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />
        <Route
          path={withSiteId(`${METRICS_DETAILS_SUB}/*`, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />
        <Route
          path={withSiteId(`${DASHBOARD_PATH}/*`, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />
        <Route
          path={withSiteId(`${DASHBOARD_SELECT_PATH}/*`, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />
        <Route
          path={withSiteId(`${DASHBOARD_METRIC_CREATE_PATH}/*`, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />
        <Route
          path={withSiteId(`${DASHBOARD_METRIC_DETAILS_PATH}/*`, siteIdList)}
          element={<enhancedComponents.Dashboard />}
        />

        <Route
          path={withSiteId(MULTIVIEW_INDEX_PATH, siteIdList)}
          element={<enhancedComponents.Multiview />}
        />
        <Route
          path={withSiteId(MULTIVIEW_PATH, siteIdList)}
          element={<enhancedComponents.Multiview />}
        />
        <Route
          path={withSiteId(ASSIST_PATH, siteIdList)}
          element={<enhancedComponents.Assist />}
        />
        <Route
          path={withSiteId(RECORDINGS_PATH, siteIdList)}
          element={<enhancedComponents.Assist />}
        />
        <Route
          path={withSiteId(HIGHLIGHTS_PATH, siteIdList)}
          element={<enhancedComponents.Highlights />}
        />

        <Route
          path={withSiteId(`${SESSIONS_PATH}/*`, siteIdList)}
          element={<enhancedComponents.SessionsOverview />}
        />
        <Route
          path={withSiteId(NOTES_PATH, siteIdList)}
          element={<enhancedComponents.SessionsOverview />}
        />
        <Route
          path={withSiteId(`${BOOKMARKS_PATH}/*`, siteIdList)}
          element={<enhancedComponents.SessionsOverview />}
        />

        <Route
          path={withSiteId(SESSION_PATH, siteIdList)}
          element={<enhancedComponents.Session />}
        />
        <Route
          path={withSiteId(LIVE_SESSION_PATH, siteIdList)}
          element={<enhancedComponents.LiveSession />}
        />
        {hasAi ? (
          <Route
            path={withSiteId(KAI_PATH, siteIdList)}
            element={<enhancedComponents.Kai />}
          />
        ) : null}
        <Route
          path={withSiteId(routes.dataManagement.activity(), siteIdList)}
          element={<enhancedComponents.Activity />}
        />
        <Route
          path={withSiteId(routes.dataManagement.userPage(), siteIdList)}
          element={<enhancedComponents.UserPage />}
        />
        <Route
          path={withSiteId(routes.dataManagement.usersList(), siteIdList)}
          element={<enhancedComponents.UsersPage />}
        />
        <Route
          path={withSiteId(routes.dataManagement.eventsList(), siteIdList)}
          element={<enhancedComponents.EventsPage />}
        />
        <Route
          path={withSiteId(routes.dataManagement.properties(), siteIdList)}
          element={<enhancedComponents.PropertiesList />}
        />
        <Route
          path={withSiteId(routes.dataManagement.actionPage(), siteIdList)}
          element={<enhancedComponents.ActionPage />}
        />
        <Route
          path={withSiteId(routes.dataManagement.actions(), siteIdList)}
          element={<enhancedComponents.ActionsPage />}
        />
        <Route
          path={withSiteId(routes.dataManagement.tags(), siteIdList)}
          element={<enhancedComponents.TagsPage />}
        />
        {Object.entries(routes.redirects).map(([fr, to]) => (
          <Route key={fr} path={fr} element={<Navigate to={to} replace />} />
        ))}
        {saasRoutes.map((route) => {
          const Component = withSiteIdUpdater(route.component);
          return (
            <Route
              key={route.path}
              path={withSiteId(route.path, siteIdList)}
              element={<Component />}
            />
          );
        })}
        <Route path="*" element={<Navigate to={fallbackTo} replace />} />
      </StableRoutes>
    </Suspense>
  );
}

export default observer(PrivateRoutes);
