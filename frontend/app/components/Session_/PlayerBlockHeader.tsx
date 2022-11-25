import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import {
  sessions as sessionsRoute,
  assist as assistRoute,
  liveSession as liveSessionRoute,
  withSiteId,
} from 'App/routes';
import { BackLink, Link } from 'UI';
import { toggleFavorite, setSessionPath } from 'Duck/sessions';
import cn from 'classnames';
import SessionMetaList from 'Shared/SessionItem/SessionMetaList';
import UserCard from './EventsBlock/UserCard';
import Tabs from 'Components/Session/Tabs';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

import stl from './playerBlockHeader.module.css';
import AssistActions from '../Assist/components/AssistActions';
import AssistTabs from '../Assist/components/AssistTabs';

const SESSIONS_ROUTE = sessionsRoute();
const ASSIST_ROUTE = assistRoute();

// TODO props
function PlayerBlockHeader(props: any) {
  const [hideBack, setHideBack] = React.useState(false);
  const { player, store } = React.useContext(PlayerContext);

  const { width, height, showEvents } = store.get();
  const toggleEvents = player.toggleEvents;

  const {
    session,
    fullscreen,
    metaList,
    closedLive = false,
    siteId,
    isAssist,
    setActiveTab,
    activeTab,
    location,
    history,
    sessionPath,
  } = props;

  React.useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    setHideBack(queryParams.has('iframe') && queryParams.get('iframe') === 'true');
  }, []);

  const backHandler = () => {
    if (
      sessionPath.pathname === history.location.pathname ||
      sessionPath.pathname.includes('/session/') ||
      isAssist
    ) {
      history.push(withSiteId(isAssist ? ASSIST_ROUTE : SESSIONS_ROUTE, siteId));
    } else {
      history.push(
        sessionPath ? sessionPath.pathname + sessionPath.search : withSiteId(SESSIONS_ROUTE, siteId)
      );
    }
  };

  const { sessionId, userId, userNumericHash, live, metadata, isCallActive, agentIds } = session;
  let _metaList = Object.keys(metadata)
    .filter((i) => metaList.includes(i))
    .map((key) => {
      const value = metadata[key];
      return { label: key, value };
    });

  const TABS = [props.tabs.EVENTS, props.tabs.HEATMAPS].map((tab) => ({
    text: tab,
    key: tab,
  }));

  return (
    <div className={cn(stl.header, 'flex justify-between', { hidden: fullscreen })}>
      <div className="flex w-full items-center">
        {!hideBack && (
          <div className="flex items-center h-full" onClick={backHandler}>
            {/* @ts-ignore TODO */}
            <BackLink label="Back" className="h-full" />
            <div className={stl.divider} />
          </div>
        )}
        <UserCard className="" width={width} height={height} />
        {isAssist && <AssistTabs userId={userId} userNumericHash={userNumericHash} />}

        <div className={cn('ml-auto flex items-center h-full', { hidden: closedLive })}>
          {live && !isAssist && (
            <>
              <div className={cn(stl.liveSwitchButton, 'pr-4')}>
                <Link to={withSiteId(liveSessionRoute(sessionId), siteId)}>
                  This Session is Now Continuing Live
                </Link>
              </div>
              {_metaList.length > 0 && <div className={stl.divider} />}
            </>
          )}

          {_metaList.length > 0 && (
            <div className="border-l h-full flex items-center px-2">
              <SessionMetaList className="" metaList={_metaList} maxLength={2} />
            </div>
          )}

          {isAssist && (
            // @ts-ignore TODO
            <AssistActions userId={userId} isCallActive={isCallActive} agentIds={agentIds} />
          )}
        </div>
      </div>
      {!isAssist && (
        <div className="relative border-l" style={{ minWidth: '270px' }}>
          <Tabs
            tabs={TABS}
            active={activeTab}
            onClick={(tab) => {
              if (activeTab === tab) {
                setActiveTab('');
                toggleEvents();
              } else {
                setActiveTab(tab);
                !showEvents && toggleEvents();
              }
            }}
            border={false}
          />
        </div>
      )}
    </div>
  );
}

const PlayerHeaderCont = connect(
  (state: any) => {
    const isAssist = window.location.pathname.includes('/assist/');
    const session = state.getIn(['sessions', 'current']);

    return {
      isAssist,
      session,
      sessionPath: state.getIn(['sessions', 'sessionPath']),
      local: state.getIn(['sessions', 'timezone']),
      funnelRef: state.getIn(['funnels', 'navRef']),
      siteId: state.getIn(['site', 'siteId']),
      metaList: state.getIn(['customFields', 'list']).map((i: any) => i.key),
      closedLive: !!state.getIn(['sessions', 'errors']) || (isAssist && !session.live),
    };
  },
  {
    toggleFavorite,
    setSessionPath,
  }
)(observer(PlayerBlockHeader));

export default withRouter(PlayerHeaderCont);
