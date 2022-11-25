import React from 'react';
import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Loader } from 'UI';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import { withRequest } from 'HOCs';
import { PlayerProvider, connectPlayer, init as initPlayer, clean as cleanPlayer } from 'Player';
import withPermissions from 'HOCs/withPermissions';

import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.module.css';

const InitLoader = connectPlayer((state) => ({
  loading: !state.initialized,
}))(Loader);

function LivePlayer({
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
  const [fullView, setFullView] = useState(false);
  useEffect(() => {
    if (!loadingCredentials) {
      const sessionWithAgentData = {
        ...session.toJS(),
        agentInfo: {
          email: userEmail,
          name: userName,
        },
      };
      initPlayer(sessionWithAgentData, assistCredendials, true);
    }
    return () => cleanPlayer();
  }, [session.sessionId, loadingCredentials, assistCredendials]);

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

  return (
    <PlayerProvider>
      <InitLoader className="flex-1 p-3">
        {!fullView && (
          <PlayerBlockHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={TABS}
            fullscreen={fullscreen}
          />
        )}
        <div className={styles.session} data-fullscreen={fullscreen || fullView}>
          <PlayerBlock fullView={fullView} />
        </div>
      </InitLoader>
    </PlayerProvider>
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
