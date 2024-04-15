import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import AssistView from './AssistView'

interface Props extends RouteComponentProps {
  match: any;
}

function AssistRouter(props: Props) {
  return (
    <div className="w-full">
      <AssistView />
    </div>
  );
}

export default withRouter(AssistRouter);
