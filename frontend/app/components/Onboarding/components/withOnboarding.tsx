import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { connect, ConnectedProps } from 'react-redux';
import { setOnboarding } from 'Duck/user';
import { sessions, withSiteId, onboarding as onboardingRoute } from 'App/routes';

export interface WithOnboardingProps {
  history: RouteComponentProps['history'];
  skip?: () => void;
  navTo?: (tab: string) => void;
  match: {
    params: {
      activeTab: string;
      siteId: string;
    };
  };
}

const connector = connect(
  (state: any) => ({
    someData: state.someData,
  }),
  { setOnboarding }
);

type PropsFromRedux = ConnectedProps<typeof connector>;

const withOnboarding = <P extends RouteComponentProps>(
  Component: React.ComponentType<P & WithOnboardingProps & PropsFromRedux>
) => {
  const WithOnboarding: React.FC<P & WithOnboardingProps & PropsFromRedux> = (props) => {
    const {
      match: {
        params: { activeTab, siteId },
      },
    } = props;
    const skip = () => {
      // implementation of your method goes here
      props.setOnboarding(true);
      props.history.push(sessions());
    };

    const route = (path: string) => {
      return withSiteId(onboardingRoute(path));
    };

    const navTo = (tab: string) => {
      props.history.push(withSiteId(onboardingRoute(tab), siteId));
    };

    return <Component skip={skip} navTo={navTo} {...props} />;
  };

  return withRouter(connector(WithOnboarding as React.ComponentType<any>));
};

export default withOnboarding;
