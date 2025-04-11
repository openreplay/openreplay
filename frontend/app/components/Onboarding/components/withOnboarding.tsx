import React, { useMemo } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import {
  sessions,
  withSiteId,
  onboarding as onboardingRoute,
} from 'App/routes';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

export interface WithOnboardingProps {
  history: RouteComponentProps['history'];
  skip?: () => void;
  navTo?: (tab: string) => void;
  site?: any;
  match: {
    params: {
      activeTab: string;
      siteId: string;
    };
  };
}

const withOnboarding = <P extends RouteComponentProps>(
  Component: React.ComponentType<P & WithOnboardingProps>,
) => {
  const WithOnboarding: React.FC<P & WithOnboardingProps> = (props) => {
    const { projectsStore, userStore } = useStore();
    const sites = projectsStore.list;
    const {
      match: {
        params: { siteId },
      },
    } = props;
    const site = useMemo(
      () => sites.find((s: any) => s.id === siteId),
      [sites, siteId],
    );

    const skip = () => {
      userStore.setOnboarding(true);
      props.history.push(withSiteId(sessions(), siteId));
    };

    const navTo = (tab: string) => {
      props.history.push(withSiteId(onboardingRoute(tab), siteId));
    };

    return <Component skip={skip} navTo={navTo} {...props} site={site} />;
  };

  return withRouter(observer(WithOnboarding));
};

export default withOnboarding;
