import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { connect, ConnectedProps } from 'react-redux';

interface WithOnboardingProps {
  skip?: () => void;
}

const mapStateToProps = (state: any) => {
  return {
    someData: state.someData,
  };
};

const connector = connect(mapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

const withOnboarding = <P extends RouteComponentProps>(
  Component: React.ComponentType<P & WithOnboardingProps & PropsFromRedux>,
) => {
  const WithOnboarding: React.FC<P & WithOnboardingProps & PropsFromRedux> = (props) => {
    const skip = () => {
      // implementation of your method goes here
    };

    return <Component skip={skip} {...props} />;
  };

  return withRouter(connector(WithOnboarding as React.ComponentType<any>));
};

export default withOnboarding;
