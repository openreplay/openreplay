import { Switch, Route, Redirect } from 'react-router';
import { BrowserRouter, withRouter } from 'react-router-dom';
import { connect } from 'react-redux';
import { Notification } from 'UI';
import { Loader } from 'UI';
import { fetchUserInfo } from 'Duck/user';
import withSiteIdUpdater from 'HOCs/withSiteIdUpdater';
import Login from 'Components/Login/Login';
import ForgotPassword from 'Components/ForgotPassword/ForgotPassword';
import UpdatePassword from 'Components/UpdatePassword/UpdatePassword';
import ClientPure from 'Components/Client/Client';
import OnboardingPure from 'Components/Onboarding/Onboarding';
import SessionPure from 'Components/Session/Session';
import BugFinderPure from 'Components/BugFinder/BugFinder';
import DashboardPure from 'Components/Dashboard/Dashboard';
import ErrorsPure from 'Components/Errors/Errors';
import Header from 'Components/Header/Header';
// import ResultsModal from 'Shared/Results/ResultsModal';
import FunnelDetails from 'Components/Funnels/FunnelDetails';
import FunnelIssueDetails from 'Components/Funnels/FunnelIssueDetails';

import APIClient from './api_client';
import * as routes from './routes';
import Signup from './components/Signup/Signup';
import { fetchTenants } from 'Duck/user';

const BugFinder = withSiteIdUpdater(BugFinderPure);
const Dashboard = withSiteIdUpdater(DashboardPure);
const Session = withSiteIdUpdater(SessionPure);
const Client = withSiteIdUpdater(ClientPure);
const Onboarding = withSiteIdUpdater(OnboardingPure);
const Errors = withSiteIdUpdater(ErrorsPure);
const Funnels = withSiteIdUpdater(FunnelDetails);
const FunnelIssue = withSiteIdUpdater(FunnelIssueDetails);
const withSiteId = routes.withSiteId;
const withObTab = routes.withObTab;

const DASHBOARD_PATH = routes.dashboard();
const SESSIONS_PATH = routes.sessions();
const ERRORS_PATH = routes.errors();
const ERROR_PATH = routes.error();
const FUNNEL_PATH = routes.funnel();
const FUNNEL_ISSUE_PATH = routes.funnelIssue();
const SESSION_PATH = routes.session();
const LIVE_SESSION_PATH = routes.liveSession();
const LOGIN_PATH = routes.login();
const SIGNUP_PATH = routes.signup();
const FORGOT_PASSWORD = routes.forgotPassword();
const CLIENT_PATH = routes.client();
const ONBOARDING_PATH = routes.onboarding();

@withRouter
@connect((state) => {
  const siteId = state.getIn([ 'user', 'siteId' ]);
  const jwt = state.get('jwt');
  const changePassword = state.getIn([ 'user', 'account', 'changePassword' ]);
  const userInfoLoading = state.getIn([ 'user', 'fetchUserInfoRequest', 'loading' ]);
  const fetchingTenants = state.get('user', 'fetchTenantsRequest', 'loading');
  return {
    jwt,
    siteId,
    changePassword,
    sites: state.getIn([ 'user', 'client', 'sites' ]),
    isLoggedIn: jwt !== null && !changePassword,
    loading: siteId === null || userInfoLoading || fetchingTenants,
    email: state.getIn([ 'user', 'account', 'email' ]),
    account: state.getIn([ 'user', 'account' ]),
    organisation: state.getIn([ 'user', 'client', 'name' ]),
    tenantId: state.getIn([ 'user', 'client', 'tenantId' ]),
    tenants: state.getIn(['user', 'tenants']),
  };
}, {
  fetchUserInfo, fetchTenants
})
class Router extends React.Component {
  constructor(props) {
    super(props);
    if (props.isLoggedIn) {
      Promise.all([props.fetchUserInfo()])
      .then(() => this.onLoginLogout());
    }
    props.fetchTenants();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.email !== this.props.email) {
      this.onLoginLogout();
    }
  }

  onLoginLogout() {
    const { email, account, organisation } = this.props;
  }

  render() {    
    const { isLoggedIn, jwt, siteId, sites, loading, changePassword, location, tenants } = this.props;
    const siteIdList = sites.map(({ id }) => id).toJS();
    const hideHeader = location.pathname && location.pathname.includes('/session/');

    return isLoggedIn ?
      <Loader loading={ loading } className="flex-1" >
        {!hideHeader && <Header key="header"/>}
        <Notification />
        
        <Switch key="content" >
          <Route path={ CLIENT_PATH } component={ Client } />
          <Route path={ withSiteId(ONBOARDING_PATH, siteIdList)} component={ Onboarding } />
          <Route
            path="/integrations/"
            render={
            ({ location }) => {
              const client = new APIClient(jwt);
              switch (location.pathname) {
                case '/integrations/slack':
                  client.post('integrations/slack/add', { 
                    code: location.search.split('=')[ 1 ],
                    state: tenantId,
                  });
                  break;
              }
              return <Redirect to={ CLIENT_PATH } />;
            }
          }
          />
          { siteIdList.length === 0 && 
            <Redirect to={ routes.client(routes.CLIENT_TABS.SITES) } />
          }
          <Route exact strict path={ withSiteId(DASHBOARD_PATH, siteIdList) } component={ Dashboard } />
          <Route exact strict path={ withSiteId(ERRORS_PATH, siteIdList) } component={ Errors } />
          <Route exact strict path={ withSiteId(ERROR_PATH, siteIdList) } component={ Errors } />
          <Route exact strict path={ withSiteId(FUNNEL_PATH, siteIdList) } component={ Funnels } />
          <Route exact strict path={ withSiteId(FUNNEL_ISSUE_PATH, siteIdList) } component={ FunnelIssue } />
          <Route exact strict path={ withSiteId(SESSIONS_PATH, siteIdList) } component={ BugFinder } />
          <Route exact strict path={ withSiteId(SESSION_PATH, siteIdList) } component={ Session } />
          <Route exact strict path={ withSiteId(LIVE_SESSION_PATH, siteIdList) } render={ (props) => <Session { ...props } live /> } />
          { routes.redirects.map(([ fr, to ]) => (
            <Redirect key={ fr } exact strict from={ fr } to={ to } />
          )) }
          <Redirect to={ withSiteId(SESSIONS_PATH, siteId) } />
        </Switch>
      </Loader> :
      <Switch>
        <Route exact strict path={ FORGOT_PASSWORD } component={ ForgotPassword } />
        <Route exact strict path={ LOGIN_PATH } component={ changePassword ? UpdatePassword : Login } />
        { tenants.length === 0 && <Route exact strict path={ SIGNUP_PATH } component={ Signup } /> }
        <Redirect to={ LOGIN_PATH } />
      </Switch>;
  }
}

export default () => (
  <BrowserRouter>
    <Router />
  </BrowserRouter>
);
