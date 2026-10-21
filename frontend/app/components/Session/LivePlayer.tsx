import { toast } from '@/ui/overlays/toast';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import withPermissions from 'HOCs/withPermissions';
import { createLiveWebPlayer } from 'Player';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

import APIClient from 'App/api_client';
import { useStore } from 'App/mstore';
import { useLocation } from 'App/routing';
import { sessionService } from 'App/services';
import Session from 'App/types/session';
import { audioContextManager } from 'App/utils/screenRecorder';
import { wrapPlayerStore } from 'Components/Session/playerStore';

import styles from '../Session_/session.module.css';
import PlayerBlock from './Player/LivePlayer/LivePlayerBlock';
import LiveActions, {
  useLiveBack,
} from './Player/LivePlayer/LivePlayerBlockHeader';
import ReplayLead from './ReplayScreen/ReplayLead';
import { ReplayScreen } from './ReplayScreen/ReplayScreen';
import {
  ILivePlayerContext,
  PlayerContext,
  defaultContextValue,
} from './playerContext';

interface Props {
  customSession?: Session;
  isMultiview?: boolean;
  query?: Record<string, (key: string) => any>;
}

let playerInst: ILivePlayerContext['player'] | undefined;

function LivePlayer({ isMultiview, customSession, query }: Props) {
  const { projectsStore, sessionStore, userStore } = useStore();
  const { isEnterprise } = userStore;
  const userEmail = userStore.account.email;
  const userName = userStore.account.name;
  const userId = userStore.account.id;
  const session = sessionStore.current;
  // @ts-ignore
  const [contextValue, setContextValue] =
    useState<ILivePlayerContext>(defaultContextValue);
  const [fullView, setFullView] = useState(false);
  const openedFromMultiview = query?.get('multi') === 'true';
  const usedSession = isMultiview ? customSession! : session;
  const location = useLocation();

  useEffect(() => {
    const projectId = projectsStore.getSiteId().siteId;
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

    const initPlayer = async (credentials = null) => {
      const [player, store] = createLiveWebPlayer(
        sessionWithAgentData,
        credentials,
        userId,
        projectId,
        wrapPlayerStore,
        toast,
      );
      setContextValue({ player, store });
      playerInst = player;
    };

    console.trace('Initializing live player');
    if (isEnterprise) {
      sessionService.getAssistCredentials().then(initPlayer);
    } else {
      void initPlayer();
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
      queryParams.get('fullScreen') === 'true' ||
      (queryParams.has('fullView') && queryParams.get('fullView') === 'true') ||
      location.pathname.includes('multiview')
    ) {
      setFullView(true);
    }
  }, []);

  if (!contextValue.player) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
      {fullView ? (
        <div
          className={styles.session}
          style={{
            height: isMultiview ? '100%' : undefined,
            width: isMultiview ? '100%' : undefined,
          }}
        >
          <PlayerBlock isMultiview={isMultiview} fullView={fullView} />
        </div>
      ) : (
        <LiveFrame isMultiview={openedFromMultiview}>
          <PlayerBlock isMultiview={isMultiview} fullView={fullView} />
        </LiveFrame>
      )}
    </PlayerContext.Provider>
  );
}

const LiveFrame = observer(
  ({
    isMultiview,
    children,
  }: {
    isMultiview?: boolean;
    children: React.ReactNode;
  }) => {
    const { store } = React.useContext(PlayerContext);
    const { width, height } = store.get();
    const back = useLiveBack(isMultiview);
    return (
      <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <ReplayScreen
          back={back}
          lead={<ReplayLead width={width} height={height} />}
          actions={<LiveActions />}
        >
          {children}
        </ReplayScreen>
      </div>
    );
  },
);

export default withPermissions(
  ['ASSIST_LIVE', 'SERVICE_ASSIST_LIVE'],
  '',
  true,
  false,
)(withLocationHandlers()(observer(LivePlayer)));
