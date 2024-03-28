import React from 'react';
import { Redirect, Route, RouteComponentProps, Switch } from 'react-router';
import { withRouter } from 'react-router-dom';

import { OB_TABS, onboarding as onboardingRoute } from 'App/routes';
import { withSiteId } from 'App/routes';
import { Icon } from 'UI';

import IdentifyUsersTab from './components/IdentifyUsersTab';
import InstallOpenReplayTab from './components/InstallOpenReplayTab';
import IntegrationsTab from './components/IntegrationsTab';
import ManageUsersTab from './components/ManageUsersTab';
import SideMenu from './components/SideMenu';

interface Props {
  match: {
    params: {
      activeTab: string;
      siteId: string;
    };
  };
  history: RouteComponentProps['history'];
}

const platformMap = {
  ios: 'mobile',
  web: 'web',
};

const Onboarding = (props: Props) => {
  const platforms = [
    {
      label: (
        <div className={'font-semibold flex gap-2 items-center'}>
          <Icon name="browser/browser" size={16} /> Web
        </div>
      ),
      value: 'web',
    } as const,
    {
      label: (
        <div className={'font-semibold flex gap-2 items-center'}>
          <Icon name="mobile" size={16} /> Mobile
        </div>
      ),
      value: 'mobile',
    } as const,
  ] as const;
  const [platform, setPlatform] = React.useState(platforms[0]);
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
  };

  return (
    <div className="flex relative">
      <SideMenu activeTab={activeTab} onClick={onMenuItemClick} />
      <div className="w-full">
        <div
          className="bg-white w-full rounded-lg mx-auto mb-8 border"
          style={{ maxWidth: '1360px' }}
        >
          <Switch>
            <Route exact strict path={route(OB_TABS.INSTALLING)}>
              <InstallOpenReplayTab
                platforms={platforms}
                platform={platform}
                setPlatform={setPlatform}
                platformMap={platformMap}
              />
            </Route>
            <Route exact strict path={route(OB_TABS.IDENTIFY_USERS)}>
              <IdentifyUsersTab
                platforms={platforms}
                platform={platform}
                setPlatform={setPlatform}
                platformMap={platformMap}
              />
            </Route>
            <Route
              exact
              strict
              path={route(OB_TABS.MANAGE_USERS)}
              component={ManageUsersTab}
            />
            <Route
              exact
              strict
              path={route(OB_TABS.INTEGRATIONS)}
              component={IntegrationsTab}
            />
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
