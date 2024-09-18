import React, { useMemo } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { connect, ConnectedProps } from 'react-redux';
import { setOnboarding } from 'Duck/user';
import { sessions, withSiteId, onboarding as onboardingRoute } from 'App/routes';
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

const connector = connect(
  null,
  { setOnboarding }
);

type PropsFromRedux = ConnectedProps<typeof connector>;

const withOnboarding = <P extends RouteComponentProps>(
  Component: React.ComponentType<P & WithOnboardingProps & PropsFromRedux>
) => {
  const WithOnboarding: React.FC<P & WithOnboardingProps & PropsFromRedux> = (props) => {
    const { projectsStore } = useStore();
    const sites = projectsStore.list;
    const {
      match: {
        params: { siteId },
      },
    } = props;
    const site = useMemo(() => sites.find((s: any) => s.id === siteId), [sites, siteId]);

    const skip = () => {
      props.setOnboarding(true);
      props.history.push(withSiteId(sessions(), siteId));
    };

    const navTo = (tab: string) => {
      props.history.push(withSiteId(onboardingRoute(tab), siteId));
    };

    return <Component skip={skip} navTo={navTo} {...props} site={site} />;
  };

  return withRouter(connector(observer(WithOnboarding as React.ComponentType<any>)));
};

export default withOnboarding;
