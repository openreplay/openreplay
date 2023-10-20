import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { Switch, Route, Redirect, withRouter, RouteComponentProps, BrowserRouter } from 'react-router-dom';
import { connect, ConnectedProps } from 'react-redux';
import { Notification } from 'UI';
import { Loader } from 'UI';
import { fetchUserInfo, setJwt } from 'Duck/user';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';
import { fetchList as fetchSiteList } from 'Duck/site';
import { withStore } from 'App/mstore';
import { Map } from 'immutable';

import APIClient from './api_client';
import * as routes from './routes';
import { OB_DEFAULT_TAB, isRoute } from 'App/routes';
import { fetchTenants } from 'Duck/user';
import { setSessionPath } from 'Duck/sessions';
import { ModalProvider } from 'Components/Modal';
import { GLOBAL_DESTINATION_PATH, GLOBAL_HAS_NO_RECORDINGS } from 'App/constants/storageKeys';
import PublicRoutes from 'App/PublicRoutes';
import Layout from 'App/layout/Layout';

const components = {
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
};


const enhancedComponents = {
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
  AssistStats: withSiteIdUpdater(components.AssistStatsPure)
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

interface RouterProps extends RouteComponentProps, ConnectedProps<typeof connector> {
  isLoggedIn: boolean;
  jwt: string;
  // siteId: number;
  sites: Map<string, any>;
  loading: boolean;
  changePassword: boolean;
  onboarding: boolean;
  isEnterprise: boolean;
  fetchUserInfo: () => any;
  fetchTenants: () => any;
  setSessionPath: (path: any) => any;
  fetchSiteList: (siteId?: number) => any;
  match: {
    params: {
      siteId: string;
    }
  };
  mstore: any;
  setJwt: (jwt: string) => any;
}

const Router: React.FC<RouterProps> = (props) => {

  const {
    isLoggedIn,
    jwt,
    siteId,
    sites,
    loading,
    location,
    onboarding,
    isEnterprise,
    fetchUserInfo,
    fetchTenants,
    setSessionPath,
    fetchSiteList,
    history,
    match: { params: { siteId: siteIdFromPath } }
  } = props;

  const checkJWT = () => {
    const urlJWT = new URLSearchParams(window.location.search).get('jwt');
    if (urlJWT && !props.isLoggedIn) {
      props.setJwt(urlJWT);
    }
  };

  useEffect(() => {
    checkJWT();

    const fetchInitialData = async () => {
      const siteIdFromPath = parseInt(window.location.pathname.split('/')[1]);
      await fetchUserInfo();
      await fetchSiteList(siteIdFromPath);
    };

    if (isLoggedIn) {
      fetchInitialData().then(r => {
        const { mstore } = props;
        mstore.initClient();
      });
    }
  }, []);

  useEffect(() => {
    if (!location.pathname.includes('login')) {
      localStorage.setItem(GLOBAL_DESTINATION_PATH, location.pathname);
    }
  }, [location]);

  function usePrevious(value: any) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    }, [value]);
    return ref.current;
  }

  const prevEmail = usePrevious(props.email);
  const prevIsLoggedIn = usePrevious(props.isLoggedIn);


  useEffect(() => {
    setSessionPath(props.location);
    const destinationPath = localStorage.getItem(GLOBAL_DESTINATION_PATH);

    if (prevEmail !== props.email && !props.email) {
      fetchTenants();
    }

    if (
      destinationPath &&
      !prevIsLoggedIn &&
      props.isLoggedIn &&
      destinationPath !== routes.login() &&
      destinationPath !== '/'
    ) {
      history.push(destinationPath + window.location.search);
    }

    if (!prevIsLoggedIn && props.isLoggedIn) {
      const fetchInitialData = async () => {
        await fetchUserInfo();
        await fetchSiteList();
        const { mstore } = props;
        mstore.initClient();
      };

      fetchInitialData();
      localStorage.removeItem(GLOBAL_DESTINATION_PATH);
    }
  }, [props.email, props.isLoggedIn, props.jwt]);

  const siteIdList = sites.map(({ id }) => id).toJS();
  const hideHeader =
    (location.pathname && location.pathname.includes('/session/')) ||
    location.pathname.includes('/assist/') ||
    location.pathname.includes('multiview');
  const hideMenu = hideHeader || location.pathname.includes('/onboarding/');

  // const isPlayer =
  //   isRoute(SESSION_PATH, location.pathname) ||
  //   isRoute(LIVE_SESSION_PATH, location.pathname) ||
  //   isRoute(MULTIVIEW_PATH, location.pathname) ||
  //   isRoute(MULTIVIEW_INDEX_PATH, location.pathname);

  const redirectToOnboarding = !onboarding && localStorage.getItem(GLOBAL_HAS_NO_RECORDINGS) === 'true';

  return isLoggedIn ? (
      <ModalProvider>
        <Layout hideHeader={hideHeader} siteId={siteId}>
          <Loader loading={loading} className='flex-1'>
            <Notification />

            <Suspense fallback={<Loader loading={true} className='flex-1' />}>
              <Switch key='content'>
                <Route path={CLIENT_PATH} component={enhancedComponents.Client} />
                <Route path={withSiteId(ONBOARDING_PATH, siteIdList)} component={enhancedComponents.Onboarding} />
                <Route
                  path='/integrations/'
                  render={({ location }) => {
                    const client = new APIClient(jwt);
                    switch (location.pathname) {
                      case '/integrations/slack':
                        client.post('integrations/slack/add', {
                          code: location.search.split('=')[1],
                          state: props.tenantId
                        });
                        break;
                      case '/integrations/msteams':
                        client.post('integrations/msteams/add', {
                          code: location.search.split('=')[1],
                          state: props.tenantId
                        });
                        break;
                    }
                    return <Redirect to={CLIENT_PATH} />;
                  }}
                />
                {redirectToOnboarding && <Redirect to={withSiteId(ONBOARDING_REDIRECT_PATH, siteId)} />}

                {/* DASHBOARD and Metrics */}
                <Route exact strict path={[
                  withSiteId(ALERTS_PATH, siteIdList),
                  withSiteId(ALERT_EDIT_PATH, siteIdList),
                  withSiteId(ALERT_CREATE_PATH, siteIdList),
                  withSiteId(METRICS_PATH, siteIdList),
                  withSiteId(METRICS_DETAILS, siteIdList),
                  withSiteId(METRICS_DETAILS_SUB, siteIdList),
                  withSiteId(DASHBOARD_PATH, siteIdList),
                  withSiteId(DASHBOARD_SELECT_PATH, siteIdList),
                  withSiteId(DASHBOARD_METRIC_CREATE_PATH, siteIdList),
                  withSiteId(DASHBOARD_METRIC_DETAILS_PATH, siteIdList)
                ]} component={enhancedComponents.Dashboard} />

                <Route exact path={withSiteId(MULTIVIEW_INDEX_PATH, siteIdList)}
                       component={enhancedComponents.Multiview} />
                <Route path={withSiteId(MULTIVIEW_PATH, siteIdList)} component={enhancedComponents.Multiview} />
                <Route exact strict path={withSiteId(ASSIST_PATH, siteIdList)} component={enhancedComponents.Assist} />
                <Route exact strict path={withSiteId(RECORDINGS_PATH, siteIdList)}
                       component={enhancedComponents.Assist} />
                <Route exact strict path={withSiteId(ASSIST_STATS_PATH, siteIdList)}
                        component={enhancedComponents.AssistStats} />
                <Route exact strict path={withSiteId(FUNNEL_PATH, siteIdList)}
                       component={enhancedComponents.FunnelPage} />
                <Route exact strict path={withSiteId(FUNNEL_CREATE_PATH, siteIdList)}
                       component={enhancedComponents.FunnelsDetails} />
                <Route exact strict path={withSiteId(FUNNEL_ISSUE_PATH, siteIdList)}
                       component={enhancedComponents.FunnelIssue} />
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
                    withSiteId(BOOKMARKS_PATH, siteIdList)
                  ]}
                  component={enhancedComponents.SessionsOverview}
                />
                <Route exact strict path={withSiteId(SESSION_PATH, siteIdList)} component={enhancedComponents.Session} />
                <Route exact strict path={withSiteId(LIVE_SESSION_PATH, siteIdList)} component={enhancedComponents.LiveSession} />

                {Object.entries(routes.redirects).map(([fr, to]) => (
                  <Redirect key={fr} exact strict from={fr} to={to} />
                ))}
                <Redirect to={withSiteId(SESSIONS_PATH, siteId)} />
              </Switch>
            </Suspense>
          </Loader>
        </Layout>
      </ModalProvider>
    ) :
    <PublicRoutes />;
};

const mapStateToProps = (state: Map<string, any>) => {
  const siteId = state.getIn(['site', 'siteId']);
  const jwt = state.getIn(['user', 'jwt']);
  const changePassword = state.getIn(['user', 'account', 'changePassword']);
  const userInfoLoading = state.getIn(['user', 'fetchUserInfoRequest', 'loading']);

  return {
    jwt,
    siteId,
    changePassword,
    sites: state.getIn(['site', 'list']),
    isLoggedIn: jwt !== null && !changePassword,
    loading: siteId === null || userInfoLoading,
    email: state.getIn(['user', 'account', 'email']),
    account: state.getIn(['user', 'account']),
    organisation: state.getIn(['user', 'account', 'name']),
    tenantId: state.getIn(['user', 'account', 'tenantId']),
    tenants: state.getIn(['user', 'tenants']),
    onboarding: state.getIn(['user', 'onboarding']),
    isEnterprise:
      state.getIn(['user', 'account', 'edition']) === 'ee' ||
      state.getIn(['user', 'authDetails', 'edition']) === 'ee'
  };
};


const mapDispatchToProps = {
  fetchUserInfo,
  fetchTenants,
  setSessionPath,
  fetchSiteList,
  setJwt
};

const connector = connect(mapStateToProps, mapDispatchToProps);

const RouterWithStore = withStore(withRouter(connector(Router)));

const App: React.FC = () => (
  <BrowserRouter>
    <RouterWithStore />
  </BrowserRouter>
);

export default App;
