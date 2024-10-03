import { audioContextManager } from 'App/utils/screenRecorder';
import React from 'react';
import { useEffect, useState } from 'react';
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
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

interface Props {
  customSession?: Session;
  isMultiview?: boolean;
  query?: Record<string, (key: string) => any>;
}

let playerInst: ILivePlayerContext['player'] | undefined;

function LivePlayer({
  isMultiview,
  customSession,
  query,
}: Props) {
  const { projectsStore, sessionStore, userStore } = useStore();
  const isEnterprise = userStore.isEnterprise;
  const userEmail = userStore.account.email;
  const userName = userStore.account.name;
  const userId = userStore.account.id;
  const session = sessionStore.current;
  // @ts-ignore
  const [contextValue, setContextValue] = useState<ILivePlayerContext>(defaultContextValue);
  const [fullView, setFullView] = useState(false);
  const openedFromMultiview = query?.get('multi') === 'true';
  const usedSession = isMultiview ? customSession! : session;
  const location = useLocation();

  useEffect(() => {
    const projectId = projectsStore.getSiteId();
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
            projectId,
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
        projectId,
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
  withLocationHandlers()(observer(LivePlayer))
);
