import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions';
import AssistRouter from './AssistRouter';
import { connect } from 'react-redux';

interface Props extends RouteComponentProps {
  siteId: string;
  history: any;
  isEnterprise: boolean;
}

function Assist(props: Props) {
  return (
    <AssistRouter />
  );
}

const Cont = connect((state: any) => ({
  isEnterprise:
    state.getIn(['user', 'account', 'edition']) === 'ee' ||
    state.getIn(['user', 'authDetails', 'edition']) === 'ee'
}))(Assist);

export default withPageTitle('Assist - OpenReplay')(
  withPermissions(['ASSIST_LIVE', 'SERVICE_ASSIST_LIVE'], '', false, false)(withRouter(Cont))
);
