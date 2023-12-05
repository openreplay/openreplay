import React, { lazy, Suspense } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { Loader } from 'UI';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';

import APIClient from './api_client';
import * as routes from './routes';
import { OB_DEFAULT_TAB } from 'App/routes';
import { GLOBAL_HAS_NO_RECORDINGS } from 'App/constants/storageKeys';
import { Map } from 'immutable';
import AdditionalRoutes from 'App/AdditionalRoutes';

const components: any = {
  SessionPure: lazy(() => import('Components/Session/Session')),
  LiveSessionPure: lazy(() => import('Components/Session/LiveSession')),
  OnboardingPure: lazy(() => import('Components/Onboarding/Onboarding')),
  ClientPure: lazy(() => import('Components/Client/Client')),
  AssistPure: lazy(() => import('Components/Assist/AssistRouter')),
  SessionsOverviewPure: lazy(() => import('Components/Overview')),
  DashboardPure: lazy(() => import('Components/Dashboard/NewDashboard')),
  FunnelDetailsPure: lazy(() => import('Components/Funnels/FunnelDetails')),
  FunnelIssueDetails: lazy(() => import('Components/Funnels/FunnelIssueDetails')),
  FunnelPagePure: lazy(() => import('Components/Funnels/FunnelPage')),
  MultiviewPure: lazy(() => import('Components/Session_/Multiview/Multiview')),
  AssistStatsPure: lazy(() => import('Components/AssistStats')),
  UsabilityTestingPure: lazy(() => import('Components/UsabilityTesting/UsabilityTesting')),
  UsabilityTestEditPure: lazy(() => import('Components/UsabilityTesting/TestEdit')),
  UsabilityTestOverviewPure: lazy(() => import('Components/UsabilityTesting/TestOverview')),
};

const enhancedComponents: any = {
  SessionsOverview: withSiteIdUpdater(components.SessionsOverviewPure),
  Dashboard: withSiteIdUpdater(components.DashboardPure),
  Session: withSiteIdUpdater(components.SessionPure),
  LiveSession: withSiteIdUpdater(components.LiveSessionPure),
  Assist: withSiteIdUpdater(components.AssistPure),
  Client: withSiteIdUpdater(components.ClientPure),
  Onboarding: withSiteIdUpdater(components.OnboardingPure),
  FunnelPage: withSiteIdUpdater(components.FunnelPagePure),
  FunnelsDetails: withSiteIdUpdater(components.FunnelDetailsPure),
  FunnelIssue: withSiteIdUpdater(components.FunnelIssueDetails),
  Multiview: withSiteIdUpdater(components.MultiviewPure),
  AssistStats: withSiteIdUpdater(components.AssistStatsPure),
  UsabilityTesting: withSiteIdUpdater(components.UsabilityTestingPure),
  UsabilityTestEdit: withSiteIdUpdater(components.UsabilityTestEditPure),
  UsabilityTestOverview: withSiteIdUpdater(components.UsabilityTestOverviewPure),
};

const withSiteId = routes.withSiteId;

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
const FUNNEL_PATH = routes.funnels();
const FUNNEL_CREATE_PATH = routes.funnelsCreate();
const FUNNEL_ISSUE_PATH = routes.funnelIssue();
const SESSION_PATH = routes.session();
const CLIENT_PATH = routes.client();
const ONBOARDING_PATH = routes.onboarding();
const ONBOARDING_REDIRECT_PATH = routes.onboarding(OB_DEFAULT_TAB);

const ASSIST_PATH = routes.assist();
const LIVE_SESSION_PATH = routes.liveSession();
const MULTIVIEW_PATH = routes.multiview();
const MULTIVIEW_INDEX_PATH = routes.multiviewIndex();
const ASSIST_STATS_PATH = routes.assistStats();

const USABILITY_TESTING_PATH = routes.usabilityTesting();
const USABILITY_TESTING_EDIT_PATH = routes.usabilityTestingEdit();
const USABILITY_TESTING_VIEW_PATH = routes.usabilityTestingView();

interface Props {
  isEnterprise: boolean;
  tenantId: string;
  siteId: string;
  jwt: string;
  sites: Map<string, any>;
  onboarding: boolean;
}

function PrivateRoutes(props: Props) {
  const { onboarding, sites, siteId, jwt } = props;
  const redirectToOnboarding =
    !onboarding && localStorage.getItem(GLOBAL_HAS_NO_RECORDINGS) === 'true';
  const siteIdList: any = sites.map(({ id }) => id).toJS();
  return (
    <Suspense fallback={<Loader loading={true} className="flex-1" />}>
      <Switch key="content">
        <Route path={CLIENT_PATH} component={enhancedComponents.Client} />
        <Route
          path={withSiteId(ONBOARDING_PATH, siteIdList)}
          component={enhancedComponents.Onboarding}
        />
        <Route
          path="/integrations/"
          render={({ location }) => {
            const client = new APIClient();
            switch (location.pathname) {
              case '/integrations/slack':
                client.post('integrations/slack/add', {
                  code: location.search.split('=')[1],
                  state: props.tenantId,
                });
                break;
              case '/integrations/msteams':
                client.post('integrations/msteams/add', {
                  code: location.search.split('=')[1],
                  state: props.tenantId,
                });
                break;
            }
            return <Redirect to={CLIENT_PATH} />;
          }}
        />
        {redirectToOnboarding && <Redirect to={withSiteId(ONBOARDING_REDIRECT_PATH, siteId)} />}

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
          path={withSiteId(ASSIST_STATS_PATH, siteIdList)}
          component={enhancedComponents.AssistStats}
        />
        <Route
          exact
          strict
          path={withSiteId(FUNNEL_PATH, siteIdList)}
          component={enhancedComponents.FunnelPage}
        />
        <Route
          exact
          strict
          path={withSiteId(FUNNEL_CREATE_PATH, siteIdList)}
          component={enhancedComponents.FunnelsDetails}
        />
        <Route
          exact
          strict
          path={withSiteId(FUNNEL_ISSUE_PATH, siteIdList)}
          component={enhancedComponents.FunnelIssue}
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

        {Object.entries(routes.redirects).map(([fr, to]) => (
          <Redirect key={fr} exact strict from={fr} to={to} />
        ))}
        <AdditionalRoutes redirect={withSiteId(routes.sessions(), siteId)} />
      </Switch>
    </Suspense>
  );
}

export default connect((state: any) => ({
  changePassword: state.getIn(['user', 'account', 'changePassword']),
  onboarding: state.getIn(['user', 'onboarding']),
  sites: state.getIn(['site', 'list']),
  siteId: state.getIn(['site', 'siteId']),
  jwt: state.getIn(['user', 'jwt']),
  tenantId: state.getIn(['user', 'account', 'tenantId']),
  isEnterprise:
    state.getIn(['user', 'account', 'edition']) === 'ee' ||
    state.getIn(['user', 'authDetails', 'edition']) === 'ee',
}))(PrivateRoutes);
