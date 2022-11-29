import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions'
import AssistRouter from './AssistRouter';
import { SideMenuitem } from 'UI';
import { withSiteId, assist, recordings } from 'App/routes';


interface Props extends RouteComponentProps {
  siteId: string;
  history: any;
  setShowAlerts: (show: boolean) => void;
}

function Assist(props: Props) {
  const { history, siteId, setShowAlerts } = props;
  const isAssist = history.location.pathname.includes('assist');
  const isRecords = history.location.pathname.includes('recordings');

  const redirect = (path: string) => {
    history.push(withSiteId(path, siteId));
  };
  return (
    <div className="page-margin container-90 flex relative">
        <div className="flex-1 flex">
          <div className="side-menu">
          <SideMenuitem
            active={isAssist}
            id="menu-assist"
            title="Live Sessions"
            iconName="play-circle-light"
            onClick={() => redirect(assist())}
          />
          <SideMenuitem
            active={isRecords}
            id="menu-rec"
            title="Recordings"
            iconName="record-circle"
            onClick={() => redirect(recordings())}
          />
          </div>
          <div className="side-menu-margined w-full">
            <AssistRouter />
          </div>
        </div>
    </div>
  )
}

export default withPageTitle("Assist - OpenReplay")(withPermissions(['ASSIST_LIVE'])(withRouter(Assist)));
