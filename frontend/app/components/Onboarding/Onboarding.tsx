import React from 'react';
import SideMenu from './components/SideMenu';
import { withRouter } from 'react-router-dom';
import { Switch, Route, Redirect, RouteComponentProps } from 'react-router';
import { OB_TABS, onboarding as onboardingRoute } from 'App/routes';
import InstallOpenReplayTab from './components/InstallOpenReplayTab';
import IdentifyUsersTab from './components/IdentifyUsersTab';
import IntegrationsTab from './components/IntegrationsTab';
import ManageUsersTab from './components/ManageUsersTab';
import { withSiteId } from 'App/routes';
interface Props {
  match: {
    params: {
      activeTab: string;
      siteId: string;
    };
  };
  history: RouteComponentProps['history'];
}
const Onboarding = (props: Props) => {
  const {
    match: {
      params: { activeTab, siteId },
    },
  } = props;

  const route = (path: string) => {
    return withSiteId(onboardingRoute(path));
  };

  const onMenuItemClick = (tab: string) => {
    props.history.push(withSiteId(onboardingRoute(tab), siteId));
  }

  return (
    <div className="page-margin container-90 flex relative">
      <div className="side-menu">
        <SideMenu activeTab={activeTab} onClick={onMenuItemClick} />
      </div>
      <div className="side-menu-margined w-full">
        <div
          className="bg-white w-full rounded-lg mx-auto mb-8 border"
          style={{ maxWidth: '1300px' }}
        >
          <Switch>
            <Route exact strict path={route(OB_TABS.INSTALLING)} component={InstallOpenReplayTab} />
            <Route exact strict path={route(OB_TABS.IDENTIFY_USERS)} component={IdentifyUsersTab} />
            <Route exact strict path={route(OB_TABS.MANAGE_USERS)} component={ManageUsersTab} />
            <Route exact strict path={route(OB_TABS.INTEGRATIONS)} component={IntegrationsTab} />
            <Redirect to={route(OB_TABS.INSTALLING)} />
          </Switch>
        </div>
      </div>
      {/* <div className="py-6 px-4 w-full flex items-center fixed bottom-0 bg-white border-t z-10">
        <div className="ml-auto">
          <OnboardingNavButton />
        </div>
      </div> */}
    </div>
  );
};

export default withRouter(Onboarding);
