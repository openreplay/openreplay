import { observer } from 'mobx-react-lite';
import React from 'react';
import { useNavigate, useLocation } from "react-router";

import { useStore } from 'App/mstore';
import {
  assist as assistRoute,
  sessions as sessionsRoute,
  withSiteId,
} from 'App/routes';
import { Icon } from 'UI';
import { Button } from 'antd'

import stl from './NoSessionPermission.module.css';

const SESSIONS_ROUTE = sessionsRoute();
const ASSIST_ROUTE = assistRoute();

interface Props {
  isLive?: boolean;
}
function NoSessionPermission(props: Props) {
  const { projectsStore, sessionStore } = useStore();
  const session = sessionStore.current;
  const sessionPath = sessionStore.sessionPath;
  const isAssist = window.location.pathname.includes('/assist/');
  const siteId = projectsStore.siteId!;
  const navigate = useNavigate();
  const location = useLocation();

  const backHandler = () => {
    if (
      sessionPath.pathname === location.pathname ||
      sessionPath.pathname.includes('/session/') ||
      isAssist
    ) {
      navigate(
        withSiteId(isAssist ? ASSIST_ROUTE : SESSIONS_ROUTE, siteId)
      );
    } else {
      navigate(
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
      {session.live ? (
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
      <Button type="primary" onClick={backHandler} className="mt-6">
        GO BACK
      </Button>
    </div>
  );
}

export default observer(NoSessionPermission)
