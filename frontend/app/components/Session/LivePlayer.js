import React from 'react';
import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import { withRequest } from 'HOCs';
import withPermissions from 'HOCs/withPermissions';
import { PlayerContext, defaultContextValue } from './playerContext';
import { makeAutoObservable } from 'mobx';

import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.module.css';

function LivePlayer ({
  session,
  toggleFullscreen,
  closeBottomBlock,
  fullscreen,
  loadingCredentials,
  assistCredendials,
  request,
  isEnterprise,
  userEmail,
  userName,
}) {
  const [contextValue, setContextValue] = useState<IPlayerContext>(defaultContextValue);
  const [fullView, setFullView] = useState(false);
  useEffect(() => {
    if (!loadingCredentials) {
      const sessionWithAgentData = {
        ...session.toJS(),
        agentInfo: {
          email: userEmail,
          name: userName,
        },
      }
      // initPlayer(sessionWithAgentData, assistCredendials, true);
      const [LivePlayer, LivePlayerStore] = createLiveWebPlayer(
        sessionWithAgentData,
        assistCredendials,
        (state) => makeAutoObservable(state)
        )
      setContextValue({ player: LivePlayer, store: LivePlayerStore });

    }
    return () => LivePlayer.clean()
  }, [ session.sessionId, loadingCredentials, assistCredendials ]);

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.has('fullScreen') && queryParams.get('fullScreen') === 'true') {
      setFullView(true);
    }

    if (isEnterprise) {
      request();
    }
    return () => {
      toggleFullscreen(false);
      closeBottomBlock();
    };
  }, []);

  const TABS = {
    EVENTS: 'User Steps',
    HEATMAPS: 'Click Map',
  };
  const [activeTab, setActiveTab] = useState('');

  if (!contextValue.player) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
      <PlayerProvider>
      {!fullView && (<PlayerBlockHeader activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} fullscreen={fullscreen}/>)}
          <div className={ styles.session } data-fullscreen={fullscreen}>
              <PlayerBlock />
          </div>
      </PlayerProvider>
    </PlayerContext.Provider>
  );
}

export default withRequest({
  initialData: null,
  endpoint: '/assist/credentials',
  dataWrapper: (data) => data,
  dataName: 'assistCredendials',
  loadingName: 'loadingCredentials',
})(
  withPermissions(
    ['ASSIST_LIVE'],
    '',
    true
  )(
    connect(
      (state) => {
        return {
          session: state.getIn(['sessions', 'current']),
          showAssist: state.getIn(['sessions', 'showChatWindow']),
          fullscreen: state.getIn(['components', 'player', 'fullscreen']),
          isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
          userEmail: state.getIn(['user', 'account', 'email']),
          userName: state.getIn(['user', 'account', 'name']),
        };
      },
      { toggleFullscreen, closeBottomBlock }
    )(LivePlayer)
  )
);
