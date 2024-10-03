import { observer } from 'mobx-react-lite';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';

import { useStore } from 'App/mstore';
import {
  assist as assistRoute,
  sessions as sessionsRoute,
  withSiteId,
} from 'App/routes';
import { Button, Icon } from 'UI';

import stl from './NoSessionPermission.module.css';

const SESSIONS_ROUTE = sessionsRoute();
const ASSIST_ROUTE = assistRoute();

interface Props extends RouteComponentProps {
  history: any;
  isLive?: boolean;
}
function NoSessionPermission(props: Props) {
  const { projectsStore, sessionStore } = useStore();
  const session = sessionStore.current;
  const sessionPath = sessionStore.sessionPath;
  const isAssist = window.location.pathname.includes('/assist/');
  const siteId = projectsStore.siteId!;
  const { history } = props;

  const backHandler = () => {
    if (
      sessionPath.pathname === history.location.pathname ||
      sessionPath.pathname.includes('/session/') ||
      isAssist
    ) {
      history.push(
        withSiteId(isAssist ? ASSIST_ROUTE : SESSIONS_ROUTE, siteId)
      );
    } else {
      history.push(
        sessionPath
          ? sessionPath.pathname + sessionPath.search
          : withSiteId(SESSIONS_ROUTE, siteId)
      );
    }
  };

  return (
    <div className={stl.wrapper}>
      <Icon name="shield-lock" size="50" className="py-16" />
      <div className={stl.title}>Not allowed</div>
      {session.isLive ? (
        <span>
          This session is still live, and you don’t have the necessary
          permissions to access this feature. Please check with your admin.
        </span>
      ) : (
        <span>
          You don’t have the necessary permissions to access this feature.
          Please check with your admin.
        </span>
      )}
      {/* <Link to="/"> */}
      <Button variant="primary" onClick={backHandler} className="mt-6">
        GO BACK
      </Button>
      {/* </Link> */}
    </div>
  );
}

export default withRouter(
  observer(NoSessionPermission)
);
