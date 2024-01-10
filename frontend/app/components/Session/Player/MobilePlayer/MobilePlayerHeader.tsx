import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { sessions as sessionsRoute, liveSession as liveSessionRoute, withSiteId } from 'App/routes';
import { BackLink, Link } from 'UI';
import { toggleFavorite, setSessionPath } from 'Duck/sessions';
import cn from 'classnames';
import SessionMetaList from 'Shared/SessionItem/SessionMetaList';
import UserCard from '../ReplayPlayer/EventsBlock/UserCard';
import Tabs from 'Components/Session/Tabs';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import stl from '../ReplayPlayer/playerBlockHeader.module.css';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { IFRAME } from 'App/constants/storageKeys';

const SESSIONS_ROUTE = sessionsRoute();

// TODO props
function PlayerBlockHeader(props: any) {
  const [hideBack, setHideBack] = React.useState(false);
  const { player, store } = React.useContext(PlayerContext);

  const playerState = store?.get?.() || { width: 0, height: 0, showEvents: false };
  const { width = 0, height = 0, showEvents = false } = playerState;

  const {
    session,
    fullscreen,
    metaList,
    siteId,
    setActiveTab,
    activeTab,
    history,
    sessionPath,
    fetchMetadata,
  } = props;

  React.useEffect(() => {
    const iframe = localStorage.getItem(IFRAME) || false;
    setHideBack(!!iframe && iframe === 'true');

    if (metaList.size === 0) fetchMetadata();
  }, []);

  const backHandler = () => {
    history.push(withSiteId(SESSIONS_ROUTE, siteId));
  };

  const { metadata } = session;
  let _metaList = Object.keys(metadata || {})
    .filter((i) => metaList.includes(i))
    .map((key) => {
      const value = metadata[key];
      return { label: key, value };
    });

  const TABS = Object.keys(props.tabs).map((tab) => ({
    text: props.tabs[tab],
    key: tab,
  }));

  return (
    <div className={cn(stl.header, 'flex justify-between', { hidden: fullscreen })}>
      <div className="flex w-full items-center">
        {!hideBack && (
          <div className="flex items-center h-full cursor-pointer group" onClick={backHandler}>
            {/* @ts-ignore TODO */}
            <BackLink label="Back" className="h-full ml-2" />
            <div className={stl.divider} />
          </div>
        )}
        <UserCard className="" width={width} height={height} />

        <div className={cn('ml-auto flex items-center h-full')}>
          {_metaList.length > 0 && (
            <div className="border-l h-full flex items-center px-2">
              <SessionMetaList className="" metaList={_metaList} maxLength={2} />
            </div>
          )}
        </div>
      </div>
      <div className="relative border-l" style={{ minWidth: '270px' }}>
        <Tabs
          tabs={TABS}
          active={activeTab}
          onClick={(tab) => {
            if (activeTab === tab) {
              setActiveTab('');
              player.toggleEvents();
            } else {
              setActiveTab(tab);
              !showEvents && player.toggleEvents();
            }
          }}
          border={false}
        />
      </div>
    </div>
  );
}

const PlayerHeaderCont = connect(
  (state: any) => {
    const session = state.getIn(['sessions', 'current']);

    return {
      session,
      sessionPath: state.getIn(['sessions', 'sessionPath']),
      local: state.getIn(['sessions', 'timezone']),
      funnelRef: state.getIn(['funnels', 'navRef']),
      siteId: state.getIn(['site', 'siteId']),
      metaList: state.getIn(['customFields', 'list']).map((i: any) => i.key),
    };
  },
  {
    toggleFavorite,
    setSessionPath,
    fetchMetadata,
  }
)(observer(PlayerBlockHeader));

export default withRouter(PlayerHeaderCont);
