import React, { lazy, Suspense } from 'react';
import { Switch, Route, Redirect } from 'react-router';
import { BrowserRouter, withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { Notification } from 'UI';
import { Loader } from 'UI';
import { fetchUserInfo } from 'Duck/user';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';
import Header from 'Components/Header/Header';
import { fetchList as fetchSiteList } from 'Duck/site';
import { withStore } from 'App/mstore';


import APIClient from './api_client';
import * as routes from './routes';
import { OB_DEFAULT_TAB, isRoute } from 'App/routes';
import Signup from 'Components/Signup';
import { fetchTenants } from 'Duck/user';
import { setSessionPath } from 'Duck/sessions';
import { ModalProvider } from './components/Modal';
import { GLOBAL_DESTINATION_PATH, GLOBAL_HAS_NO_RECORDINGS } from 'App/constants/storageKeys';
import SupportCallout from 'Shared/SupportCallout';

const Login = lazy(() => import('Components/Login/Login'));
const ForgotPassword = lazy(() => import('Components/ForgotPassword/ForgotPassword'));
const UpdatePassword = lazy(() => import('Components/UpdatePassword/UpdatePassword'));
const SessionPure = lazy(() => import('Components/Session/Session'));
const LiveSessionPure = lazy(() => import('Components/Session/LiveSession'));
const OnboardingPure = lazy(() => import('Components/Onboarding/Onboarding'));
const ClientPure = lazy(() => import('Components/Client/Client'));
const AssistPure = lazy(() => import('Components/Assist'));
const SessionsOverviewPure = lazy(() => import('Components/Overview'));
const DashboardPure = lazy(() => import('Components/Dashboard/NewDashboard'));
// const ErrorsPure = lazy(() => import('Components/Errors/Errors'));
const FunnelDetailsPure = lazy(() => import('Components/Funnels/FunnelDetails'));
const FunnelIssueDetails = lazy(() => import('Components/Funnels/FunnelIssueDetails'));
const FunnelPagePure = lazy(() => import('Components/Funnels/FunnelPage'));
const MultiviewPure = lazy(() => import('Components/Session_/Multiview/Multiview.tsx'));

const SessionsOverview = withSiteIdUpdater(SessionsOverviewPure);
const Dashboard = withSiteIdUpdater(DashboardPure);
const Session = withSiteIdUpdater(SessionPure);
const LiveSession = withSiteIdUpdater(LiveSessionPure);
const Assist = withSiteIdUpdater(AssistPure);
const Client = withSiteIdUpdater(ClientPure);
const Onboarding = withSiteIdUpdater(OnboardingPure);
// const Errors = withSiteIdUpdater(ErrorsPure);
const FunnelPage = withSiteIdUpdater(FunnelPagePure);
const FunnelsDetails = withSiteIdUpdater(FunnelDetailsPure);
const FunnelIssue = withSiteIdUpdater(FunnelIssueDetails);
const Multiview = withSiteIdUpdater(MultiviewPure)
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
const FFLAG_READ_PATH = routes.fflagRead()
const NOTES_PATH = routes.notes();
const BOOKMARKS_PATH = routes.bookmarks();
const ASSIST_PATH = routes.assist();
const RECORDINGS_PATH = routes.recordings();
// const ERRORS_PATH = routes.errors();
// const ERROR_PATH = routes.error();
const FUNNEL_PATH = routes.funnels();
const FUNNEL_CREATE_PATH = routes.funnelsCreate();
const FUNNEL_ISSUE_PATH = routes.funnelIssue();
const SESSION_PATH = routes.session();
const LIVE_SESSION_PATH = routes.liveSession();
const LOGIN_PATH = routes.login();
const SIGNUP_PATH = routes.signup();
const FORGOT_PASSWORD = routes.forgotPassword();
const CLIENT_PATH = routes.client();
const ONBOARDING_PATH = routes.onboarding();
const ONBOARDING_REDIRECT_PATH = routes.onboarding(OB_DEFAULT_TAB);
const MULTIVIEW_PATH = routes.multiview();
const MULTIVIEW_INDEX_PATH = routes.multiviewIndex();

@withStore
@withRouter
@connect(
    (state) => {
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
            existingTenant: state.getIn(['user', 'authDetails', 'tenants']),
            onboarding: state.getIn(['user', 'onboarding']),
            isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee' || state.getIn(['user', 'authDetails', 'edition']) === 'ee',
        };
    },
    {
        fetchUserInfo,
        fetchTenants,
        setSessionPath,
        fetchSiteList,
    }
)
class Router extends React.Component {
    constructor(props) {
        super(props);
        if (props.isLoggedIn) {
            this.fetchInitialData();
        }
    }

    fetchInitialData = async () => {
        const siteIdFromPath = parseInt(window.location.pathname.split("/")[1])
        await this.props.fetchUserInfo()
        await this.props.fetchSiteList(siteIdFromPath)
        const { mstore } = this.props;
        mstore.initClient();
    };

    componentDidMount() {
        const { isLoggedIn, location } = this.props;
        const destinationPath = localStorage.getItem(GLOBAL_DESTINATION_PATH);
        if (!isLoggedIn && !location.pathname.includes('login')) {
            localStorage.setItem(GLOBAL_DESTINATION_PATH, location.pathname);
        } else if (isLoggedIn && destinationPath && !location.pathname.includes(destinationPath)) {
            this.props.history.push(destinationPath || '/');
            localStorage.removeItem(GLOBAL_DESTINATION_PATH);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        this.props.setSessionPath(prevProps.location);
        const destinationPath = localStorage.getItem(GLOBAL_DESTINATION_PATH);

        if (prevProps.email !== this.props.email && !this.props.email) {
            this.props.fetchTenants();
        }

        if (
            destinationPath &&
            !prevProps.isLoggedIn &&
            this.props.isLoggedIn &&
            destinationPath !== routes.login() &&
            destinationPath !== '/'
        ) {
            this.props.history.push(destinationPath);
        }

        if (!prevProps.isLoggedIn && this.props.isLoggedIn) {
            this.fetchInitialData();
        }
    }

    render() {
        const { isLoggedIn, jwt, siteId, sites, loading, changePassword, location, existingTenant, onboarding, isEnterprise } = this.props;
        const siteIdList = sites.map(({ id }) => id).toJS();
        const hideHeader = (location.pathname && location.pathname.includes('/session/'))
            || location.pathname.includes('/assist/')
            || location.pathname.includes('multiview');
        const isPlayer = isRoute(SESSION_PATH, location.pathname)
            || isRoute(LIVE_SESSION_PATH, location.pathname)
            || isRoute(MULTIVIEW_PATH, location.pathname)
            || isRoute(MULTIVIEW_INDEX_PATH, location.pathname);

        const redirectToOnboarding = !onboarding && localStorage.getItem(GLOBAL_HAS_NO_RECORDINGS) === 'true'

        return isLoggedIn ? (
            <ModalProvider>
                <Loader loading={loading} className="flex-1">
                    <Notification />
                    {!hideHeader && <Header key="header" />}
                    <Suspense fallback={<Loader loading={true} className="flex-1" />}>
                        <Switch key="content">
                            <Route path={CLIENT_PATH} component={Client} />
                            <Route path={withSiteId(ONBOARDING_PATH, siteIdList)} component={Onboarding} />
                            <Route
                                path="/integrations/"
                                render={({ location }) => {
                                    const client = new APIClient(jwt);
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
                            {redirectToOnboarding && <Redirect to={withSiteId(ONBOARDING_REDIRECT_PATH, siteId)} />}

                            {/* DASHBOARD and Metrics */}
                            <Route exact strict path={withSiteId(ALERTS_PATH, siteIdList)} component={Dashboard} />
                            <Route exact strict path={withSiteId(ALERT_EDIT_PATH, siteIdList)} component={Dashboard} />
                            <Route exact strict path={withSiteId(ALERT_CREATE_PATH, siteIdList)} component={Dashboard} />
                            <Route exact strict path={withSiteId(METRICS_PATH, siteIdList)} component={Dashboard} />
                            <Route exact strict path={withSiteId(METRICS_DETAILS, siteIdList)} component={Dashboard} />
                            <Route exact strict path={withSiteId(METRICS_DETAILS_SUB, siteIdList)} component={Dashboard} />
                            <Route exact strict path={withSiteId(DASHBOARD_PATH, siteIdList)} component={Dashboard} />
                            <Route exact strict path={withSiteId(DASHBOARD_SELECT_PATH, siteIdList)} component={Dashboard} />
                            <Route exact strict path={withSiteId(DASHBOARD_METRIC_CREATE_PATH, siteIdList)} component={Dashboard} />
                            <Route exact strict path={withSiteId(DASHBOARD_METRIC_DETAILS_PATH, siteIdList)} component={Dashboard} />

                            <Route exact path={withSiteId(MULTIVIEW_INDEX_PATH, siteIdList)} component={Multiview} />
                            <Route path={withSiteId(MULTIVIEW_PATH, siteIdList)} component={Multiview} />
                            <Route exact strict path={withSiteId(ASSIST_PATH, siteIdList)} component={Assist} />
                            <Route exact strict path={withSiteId(RECORDINGS_PATH, siteIdList)} component={Assist} />
                            {/*<Route exact strict path={withSiteId(ERRORS_PATH, siteIdList)} component={Errors} />*/}
                            {/*<Route exact strict path={withSiteId(ERROR_PATH, siteIdList)} component={Errors} />*/}
                            <Route exact strict path={withSiteId(FUNNEL_PATH, siteIdList)} component={FunnelPage} />
                            <Route exact strict path={withSiteId(FUNNEL_CREATE_PATH, siteIdList)} component={FunnelsDetails} />
                            <Route exact strict path={withSiteId(FUNNEL_ISSUE_PATH, siteIdList)} component={FunnelIssue} />
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
                                component={SessionsOverview}
                            />
                            <Route exact strict path={withSiteId(SESSION_PATH, siteIdList)} component={Session} />
                            <Route exact strict path={withSiteId(LIVE_SESSION_PATH, siteIdList)} component={LiveSession} />
                            <Route exact strict path={withSiteId(LIVE_SESSION_PATH, siteIdList)} render={(props) => <Session {...props} live />} />
                            {routes.redirects.map(([fr, to]) => (
                                <Redirect key={fr} exact strict from={fr} to={to} />
                            ))}
                            <Redirect to={withSiteId(SESSIONS_PATH, siteId)} />
                        </Switch>
                    </Suspense>
                </Loader>
                {!isEnterprise && !isPlayer && <SupportCallout /> }
            </ModalProvider>
        ) : (
            <Suspense fallback={<Loader loading={true} className="flex-1" />}>
                <Switch>
                    <Route exact strict path={FORGOT_PASSWORD} component={ForgotPassword} />
                    <Route exact strict path={LOGIN_PATH} component={changePassword ? UpdatePassword : Login} />
                    <Route exact strict path={SIGNUP_PATH} component={Signup} />
                    <Redirect to={LOGIN_PATH} />
                </Switch>
                {!isEnterprise && <SupportCallout /> }
            </Suspense>
        );
    }
}

export default () => (
    <BrowserRouter>
        <Router />
    </BrowserRouter>
);
