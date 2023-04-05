import React from 'react';
import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import withPermissions from 'HOCs/withPermissions';
import { PlayerContext, defaultContextValue, ILivePlayerContext } from './playerContext';
import { makeAutoObservable } from 'mobx';
import { createLiveWebPlayer } from 'Player';
import PlayerBlockHeader from './Player/LivePlayer/LivePlayerBlockHeader';
import PlayerBlock from './Player/LivePlayer/LivePlayerBlock';
import styles from '../Session_/session.module.css';
import Session from 'App/mstore/types/session';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import APIClient from 'App/api_client';

interface Props {
  session: Session;
  assistCredentials: RTCIceServer[];
  isEnterprise: boolean;
  userEmail: string;
  userName: string;
  customSession?: Session;
  isMultiview?: boolean;
  query?: Record<string, (key: string) => any>;
  request: () => void;
}

function LivePlayer({
  session,
  userEmail,
  userName,
  isMultiview,
  customSession,
  query,
  isEnterprise
}: Props) {
  // @ts-ignore
  const [contextValue, setContextValue] = useState<ILivePlayerContext>(defaultContextValue);
  const [fullView, setFullView] = useState(false);
  const openedFromMultiview = query?.get('multi') === 'true'
  const usedSession = isMultiview ? customSession! : session;

  useEffect(() => {
    let playerInst: ILivePlayerContext['player'];
    if (!usedSession.sessionId || contextValue.player !== undefined) return;
    const sessionWithAgentData = {
      ...usedSession,
      agentInfo: {
        email: userEmail,
        name: userName,
      },
    };
    if (isEnterprise) {
      new APIClient().get('/config/assist/credentials').then(r => r.json())
        .then(({ data }) => {
          const [player, store] = createLiveWebPlayer(sessionWithAgentData, data, (state) =>
            makeAutoObservable(state)
          );
          setContextValue({ player, store });
          playerInst = player;
        })
    } else {
      const [player, store] = createLiveWebPlayer(sessionWithAgentData, null, (state) =>
        makeAutoObservable(state)
      );
      setContextValue({ player, store });
      playerInst = player;
    }

    return () => {
      playerInst?.clean?.();
      // @ts-ignore default empty
      setContextValue(defaultContextValue);
    }
  }, [usedSession.sessionId]);

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (
      (queryParams.has('fullScreen') && queryParams.get('fullScreen') === 'true') ||
      location.pathname.includes('multiview')
    ) {
      setFullView(true);
    }
  }, []);

  if (!contextValue.player) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
      {!fullView && (
        <PlayerBlockHeader
          // @ts-ignore
          isMultiview={openedFromMultiview}
        />
      )}
      <div
        className={styles.session}
        style={{
          height: isMultiview ? '100%' : undefined,
          width: isMultiview ? '100%' : undefined,
        }}
      >
        <PlayerBlock isMultiview={isMultiview} />
      </div>
    </PlayerContext.Provider>
  );
}

export default withPermissions(
    ['ASSIST_LIVE'],
    '',
    true
  )(
    connect(
      (state: any) => {
        return {
          session: state.getIn(['sessions', 'current']),
          showAssist: state.getIn(['sessions', 'showChatWindow']),
          isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
          userEmail: state.getIn(['user', 'account', 'email']),
          userName: state.getIn(['user', 'account', 'name']),
        };
      }
    )(withLocationHandlers()(React.memo(LivePlayer, propsAreEqual)))
  )

function propsAreEqual(prevProps: Props, nextProps: Props) {
  const { session,
    userEmail,
    userName,
    isMultiview,
    customSession,
    query,
    isEnterprise } = prevProps;
  const { session: nextSession,
    userEmail: nextUserEmail,
    userName: nextUserName,
    isMultiview: nextIsMultiview,
    customSession: nextCustomSession,
    query: nextQuery,
    isEnterprise: nextIsEnterprise } = nextProps;

  return (
    session.sessionId === nextSession.sessionId &&
    userEmail === nextUserEmail &&
    userName === nextUserName &&
    isMultiview === nextIsMultiview &&
    customSession === nextCustomSession &&
    query === nextQuery &&
    isEnterprise === nextIsEnterprise
  );
}