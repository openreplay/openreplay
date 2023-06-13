import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions';
import AssistRouter from './AssistRouter';
import { SideMenuitem } from 'UI';
import { withSiteId, assist, recordings } from 'App/routes';
import { connect } from 'react-redux';
import { ENTERPRISE_REQUEIRED } from 'App/constants';

interface Props extends RouteComponentProps {
  siteId: string;
  history: any;
  isEnterprise: boolean;
}

function Assist(props: Props) {
  const { history, siteId, isEnterprise } = props;
  const isAssist = history.location.pathname.includes('assist');
  const isRecords = history.location.pathname.includes('recordings');

  const redirect = (path: string) => {
    history.push(withSiteId(path, siteId));
  };
  // if (isEnterprise) {
    return (
      <div className="page-margin container-90 flex relative">
        <div className="flex-1 flex">
          <div className="side-menu">
            <SideMenuitem
              active={isAssist}
              id="menu-assist"
              title="Live Sessions"
              iconName="play-circle-bold"
              onClick={() => redirect(assist())}
            />
            <SideMenuitem
              active={isRecords}
              id="menu-rec"
              title="Recordings"
              iconName="record-btn"
              onClick={() => redirect(recordings())}
              disabled={!isEnterprise}
              tooltipTitle={ENTERPRISE_REQUEIRED}
            />
          </div>
          <div className="side-menu-margined w-full">
            <AssistRouter />
          </div>
        </div>
      </div>
    );
  // }

  // return (
  //   <div className="page-margin container-90 flex relative">
  //     <AssistRouter />
  //   </div>
  // )
}

const Cont = connect((state: any) => ({
  isEnterprise:
    state.getIn(['user', 'account', 'edition']) === 'ee' ||
    state.getIn(['user', 'authDetails', 'edition']) === 'ee',
}))(Assist);

export default withPageTitle('Assist - OpenReplay')(
  withPermissions(['ASSIST_LIVE'])(withRouter(Cont))
);
