import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions';
import AssistRouter from './AssistRouter';

function Assist() {
  return <AssistRouter />;
}

export default withPageTitle('Assist - OpenReplay')(
  withPermissions(
    ['ASSIST_LIVE', 'SERVICE_ASSIST_LIVE'],
    '',
    false,
    false,
  )(Assist),
);
