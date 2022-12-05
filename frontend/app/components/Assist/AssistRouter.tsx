import React from 'react';
import { Switch, Route } from 'react-router';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
  assist,
  recordings,
  withSiteId,
} from 'App/routes';
import AssistView from './AssistView'
import Recordings from './RecordingsList/Recordings'

interface Props extends RouteComponentProps {
  match: any;
}

function AssistRouter(props: Props) {
  const {
    match: {
      params: { siteId },
    },
  } = props;

  return (
    <div className="w-full">
      <Switch>
        <Route exact strict path={withSiteId(assist(), siteId)}>
          <AssistView />
        </Route>

        <Route exact strict path={withSiteId(recordings(), siteId)}>
          <Recordings />
        </Route>
      </Switch>
    </div>
  );
}

export default withRouter(AssistRouter);
