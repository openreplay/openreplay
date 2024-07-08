import { audioContextManager } from 'App/utils/screenRecorder';
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
import Session from 'App/types/session';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import APIClient from 'App/api_client';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

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
  userId: number;
  siteId: number;
}

let playerInst: ILivePlayerContext['player'] | undefined;

function LivePlayer({
  session,
  userEmail,
  userName,
  isMultiview,
  customSession,
  query,
  isEnterprise,
  userId,
  siteId,
}: Props) {
  // @ts-ignore
  const [contextValue, setContextValue] = useState<ILivePlayerContext>(defaultContextValue);
  const [fullView, setFullView] = useState(false);
  const openedFromMultiview = query?.get('multi') === 'true';
  const usedSession = isMultiview ? customSession! : session;
  const location = useLocation();

  useEffect(() => {
    playerInst = undefined;
    if (!usedSession.sessionId || contextValue.player !== undefined) return;
    console.debug('creating live player for', usedSession.sessionId);
    const sessionWithAgentData = {
      ...usedSession,
      agentInfo: {
        email: userEmail,
        name: userName,
      },
    };
    if (isEnterprise) {
      new APIClient()
        .get('/config/assist/credentials')
        .then((r) => r.json())
        .then(({ data }) => {
          const [player, store] = createLiveWebPlayer(
            sessionWithAgentData,
            data,
            userId,
            siteId,
            (state) => makeAutoObservable(state),
            toast
          );
          setContextValue({ player, store });
          playerInst = player;
        });
    } else {
      const [player, store] = createLiveWebPlayer(
        sessionWithAgentData,
        null,
        userId,
        siteId,
        (state) => makeAutoObservable(state),
        toast
      );
      setContextValue({ player, store });
      playerInst = player;
    }

    return () => {
      if (
        !location.pathname.includes('multiview') ||
        !location.pathname.includes(usedSession.sessionId)
      ) {
        console.debug('cleaning live player for', usedSession.sessionId);
        audioContextManager.clear();
        playerInst?.clean?.();
        // @ts-ignore default empty
        setContextValue(defaultContextValue);
      }
    };
  }, [location.pathname, usedSession.sessionId]);

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    if (
      (queryParams.has('fullScreen') && queryParams.get('fullScreen') === 'true') || (queryParams.has('fullView') && queryParams.get('fullView') === 'true') ||
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
        <PlayerBlock isMultiview={isMultiview} fullView={fullView} />
      </div>
    </PlayerContext.Provider>
  );
}

export default withPermissions(['ASSIST_LIVE', 'SERVICE_ASSIST_LIVE'], '', true, false)(
  connect((state: any) => {
    return {
      siteId: state.getIn([ 'site', 'siteId' ]),
      session: state.getIn(['sessions', 'current']),
      showAssist: state.getIn(['sessions', 'showChatWindow']),
      isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
      userEmail: state.getIn(['user', 'account', 'email']),
      userName: state.getIn(['user', 'account', 'name']),
      userId: state.getIn(['user', 'account', 'id']),
    };
  })(withLocationHandlers()(React.memo(LivePlayer)))
);
