import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';
import React, { Suspense, lazy } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from './mstore';
import { GLOBAL_HAS_NO_RECORDINGS } from 'App/constants/storageKeys';
import { OB_DEFAULT_TAB } from 'App/routes';
import { Loader } from 'UI';

import APIClient from './api_client';
import * as routes from './routes';
import { debounceCall } from '@/utils';
import { hasAi } from './utils/split-utils';
import { saasRoutes } from './saasComponents';

const components: any = {
  SessionPure: lazy(() => import('Components/Session/Session')),
  LiveSessionPure: lazy(() => import('Components/Session/LiveSession')),
  OnboardingPure: lazy(() => import('Components/Onboarding/Onboarding')),
  ClientPure: lazy(() => import('Components/Client/Client')),
  AssistPure: lazy(() => import('Components/Assist/AssistRouter')),
  SessionsOverviewPure: lazy(() => import('Components/Overview')),
  DashboardPure: lazy(() => import('Components/Dashboard/NewDashboard')),
  MultiviewPure: lazy(() => import('Components/Session_/Multiview/Multiview')),
  UsabilityTestingPure: lazy(
    () => import('Components/UsabilityTesting/UsabilityTesting'),
  ),
  UsabilityTestEditPure: lazy(
    () => import('Components/UsabilityTesting/TestEdit'),
  ),
  UsabilityTestOverviewPure: lazy(
    () => import('Components/UsabilityTesting/TestOverview'),
  ),
  SpotsListPure: lazy(() => import('Components/Spots/SpotsList')),
  SpotPure: lazy(() => import('Components/Spots/SpotPlayer')),
  HighlightsPure: lazy(() => import('Components/Highlights/HighlightsList')),
  KaiPure: lazy(() => import('Components/Kai/KaiChat')),
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
  UsabilityTesting: withSiteIdUpdater(components.UsabilityTestingPure),
  UsabilityTestEdit: withSiteIdUpdater(components.UsabilityTestEditPure),
  UsabilityTestOverview: withSiteIdUpdater(
    components.UsabilityTestOverviewPure,
  ),
  SpotsList: withSiteIdUpdater(components.SpotsListPure),
  Spot: components.SpotPure,
  Highlights: withSiteIdUpdater(components.HighlightsPure),
  Kai: withSiteIdUpdater(components.KaiPure),
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
const FFLAGS_PATH = routes.fflags();
const FFLAG_PATH = routes.fflag();
const FFLAG_CREATE_PATH = routes.newFFlag();
const FFLAG_READ_PATH = routes.fflagRead();
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

const USABILITY_TESTING_PATH = routes.usabilityTesting();
const USABILITY_TESTING_EDIT_PATH = routes.usabilityTestingEdit();
const USABILITY_TESTING_VIEW_PATH = routes.usabilityTestingView();

const SPOTS_LIST_PATH = routes.spotsList();
const SPOT_PATH = routes.spot();

const HIGHLIGHTS_PATH = routes.highlights();
const KAI_PATH = routes.kai();

function PrivateRoutes() {
  const { projectsStore, userStore, integrationsStore, searchStore } =
    useStore();
  const onboarding = userStore.onboarding;
  const scope = userStore.scopeState ?? 2;
  const { tenantId } = userStore.account;
  const sites = projectsStore.list;
  const { siteId } = projectsStore;
  const hasRecordings = sites.some((s) => s.recorded);
  const redirectToOnboarding =
    !onboarding &&
    (localStorage.getItem(GLOBAL_HAS_NO_RECORDINGS) === 'true' ||
      (sites.length > 0 && !hasRecordings)) &&
    scope > 0;
  const siteIdList: any = sites.map(({ id }) => id);

  React.useEffect(() => {
    if (siteId && integrationsStore.integrations.siteId !== siteId) {
      integrationsStore.integrations.setSiteId(siteId);
      void integrationsStore.integrations.fetchIntegrations(siteId);
    }
  }, [siteId]);

  React.useEffect(() => {
    if (!searchStore.urlParsed) return;
    debounceCall(() => searchStore.fetchSessions(true), 250)();
  }, [
    searchStore.urlParsed,
    searchStore.instance.filters,
    searchStore.instance.eventsOrder,
  ]);

  return (
    <Suspense fallback={<Loader loading className="flex-1" />}>
      <Switch key="content">
        <Route path={CLIENT_PATH} component={enhancedComponents.Client} />
        <Route
          path={withSiteId(ONBOARDING_PATH, siteIdList)}
          component={enhancedComponents.Onboarding}
        />
        <Route
          exact
          strict
          path={SPOTS_LIST_PATH}
          component={enhancedComponents.SpotsList}
        />
        <Route
          exact
          strict
          path={SPOT_PATH}
          component={enhancedComponents.Spot}
        />
        {scope === 1 ? <Redirect to={SPOTS_LIST_PATH} /> : null}
        <Route
          path="/integrations/"
          render={({ location }) => {
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
            return <Redirect to={CLIENT_PATH} />;
          }}
        />
        {redirectToOnboarding && (
          <Redirect to={withSiteId(ONBOARDING_REDIRECT_PATH, siteId)} />
        )}

        {/* DASHBOARD and Metrics */}
        <Route
          exact
          strict
          path={[
            withSiteId(ALERTS_PATH, siteIdList),
            withSiteId(ALERT_EDIT_PATH, siteIdList),
            withSiteId(ALERT_CREATE_PATH, siteIdList),
            withSiteId(METRICS_PATH, siteIdList),
            withSiteId(METRICS_DETAILS, siteIdList),
            withSiteId(METRICS_DETAILS_SUB, siteIdList),
            withSiteId(DASHBOARD_PATH, siteIdList),
            withSiteId(DASHBOARD_SELECT_PATH, siteIdList),
            withSiteId(DASHBOARD_METRIC_CREATE_PATH, siteIdList),
            withSiteId(DASHBOARD_METRIC_DETAILS_PATH, siteIdList),
          ]}
          component={enhancedComponents.Dashboard}
        />

        <Route
          exact
          strict
          path={withSiteId(USABILITY_TESTING_PATH, siteIdList)}
          component={enhancedComponents.UsabilityTesting}
        />
        <Route
          exact
          strict
          path={withSiteId(USABILITY_TESTING_EDIT_PATH, siteIdList)}
          component={enhancedComponents.UsabilityTestEdit}
        />
        <Route
          exact
          strict
          path={withSiteId(USABILITY_TESTING_VIEW_PATH, siteIdList)}
          component={enhancedComponents.UsabilityTestOverview}
        />

        <Route
          exact
          path={withSiteId(MULTIVIEW_INDEX_PATH, siteIdList)}
          component={enhancedComponents.Multiview}
        />
        <Route
          path={withSiteId(MULTIVIEW_PATH, siteIdList)}
          component={enhancedComponents.Multiview}
        />
        <Route
          exact
          strict
          path={withSiteId(ASSIST_PATH, siteIdList)}
          component={enhancedComponents.Assist}
        />
        <Route
          exact
          strict
          path={withSiteId(RECORDINGS_PATH, siteIdList)}
          component={enhancedComponents.Assist}
        />
        <Route
          exact
          strict
          path={withSiteId(HIGHLIGHTS_PATH, siteIdList)}
          component={enhancedComponents.Highlights}
        />
        <Route
          exact
          strict
          path={[
            withSiteId(SESSIONS_PATH, siteIdList),
            withSiteId(FFLAGS_PATH, siteIdList),
            withSiteId(FFLAG_PATH, siteIdList),
            withSiteId(FFLAG_READ_PATH, siteIdList),
            withSiteId(FFLAG_CREATE_PATH, siteIdList),
            withSiteId(NOTES_PATH, siteIdList),
            withSiteId(BOOKMARKS_PATH, siteIdList),
          ]}
          component={enhancedComponents.SessionsOverview}
        />
        <Route
          exact
          strict
          path={withSiteId(SESSION_PATH, siteIdList)}
          component={enhancedComponents.Session}
        />
        <Route
          exact
          strict
          path={withSiteId(LIVE_SESSION_PATH, siteIdList)}
          component={enhancedComponents.LiveSession}
        />
        {hasAi ? (
          <Route
            exact
            strict
            path={withSiteId(KAI_PATH, siteIdList)}
            component={enhancedComponents.Kai}
          />
        ) : null}
        {Object.entries(routes.redirects).map(([fr, to]) => (
          <Redirect key={fr} exact strict from={fr} to={to} />
        ))}
        {saasRoutes.map((route) => (
          <Route
            key={route.path}
            exact
            strict
            path={withSiteId(route.path, siteIdList)}
            component={route.component}
          />
        ))}
        <Route path={'*'}>
          <Redirect to={withSiteId(routes.sessions(), siteId)} />
        </Route>
      </Switch>
    </Suspense>
  );
}

export default observer(PrivateRoutes);
