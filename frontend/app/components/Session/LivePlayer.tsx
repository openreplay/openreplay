import React from 'react';
import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import withRequest from 'HOCs/withRequest';
import withPermissions from 'HOCs/withPermissions';
import { PlayerContext, defaultContextValue } from './playerContext';
import { makeAutoObservable } from 'mobx';
import { createLiveWebPlayer } from 'Player';
import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.module.css';
import Session from 'App/mstore/types/session';
import withLocationHandlers from 'HOCs/withLocationHandlers';

interface Props {
  session: Session;
  fullscreen: boolean;
  loadingCredentials: boolean;
  assistCredendials: RTCIceServer[];
  isEnterprise: boolean;
  userEmail: string;
  userName: string;
  customSession?: Session;
  isMultiview?: boolean;
  query?: Record<string, (key: string) => any>;
  toggleFullscreen: (isOn: boolean) => void;
  closeBottomBlock: () => void;
  request: () => void;
}

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
  isMultiview,
  customSession,
  query
}: Props) {
  const [contextValue, setContextValue] = useState(defaultContextValue);
  const [fullView, setFullView] = useState(false);
  const openedFromMultiview = query.get('multi') === 'true'
  // @ts-ignore burn immutable
  const usedSession = isMultiview ? customSession : session.toJS();

  useEffect(() => {
    if (loadingCredentials || !usedSession.sessionId) return;
    const sessionWithAgentData = {
      ...usedSession,
      agentInfo: {
        email: userEmail,
        name: userName,
      },
    };
    const [player, store] = createLiveWebPlayer(sessionWithAgentData, assistCredendials, (state) =>
      makeAutoObservable(state)
    );
    setContextValue({ player, store });

    return () => player.clean();
  }, [session.sessionId, assistCredendials]);

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (
      (queryParams.has('fullScreen') && queryParams.get('fullScreen') === 'true') ||
      location.pathname.includes('multiview')
    ) {
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
    CLICKMAP: 'Click Map',
  };
  const [activeTab, setActiveTab] = useState('');

  if (!contextValue.player) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
      {!fullView && (
        <PlayerBlockHeader
          // @ts-ignore
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={TABS}
          fullscreen={fullscreen}
          isMultiview={openedFromMultiview}
        />
      )}
      <div
        className={styles.session}
        style={{
          height: isMultiview ? '100%' : undefined,
          width: isMultiview ? '100%' : undefined,
        }}
        data-fullscreen={fullscreen}
      >
        <PlayerBlock isMultiview={isMultiview} />
      </div>
    </PlayerContext.Provider>
  );
}

export default withRequest({
  initialData: null,
  endpoint: '/assist/credentials',
  dataName: 'assistCredendials',
  loadingName: 'loadingCredentials',
})(
  withPermissions(
    ['ASSIST_LIVE'],
    '',
    true
  )(
    connect(
      (state: any) => {
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
    )(withLocationHandlers()(LivePlayer))
  )
);
