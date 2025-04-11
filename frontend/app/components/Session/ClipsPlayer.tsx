import { createClipPlayer } from 'Player';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { Loader } from 'UI';

import ClipPlayerHeader from 'Components/Session/Player/ClipPlayer/ClipPlayerHeader';
import ClipPlayerContent from 'Components/Session/Player/ClipPlayer/ClipPlayerContent';
import Session from 'Types/session';
import { sessionService } from '@/services';
import {
  IPlayerContext,
  PlayerContext,
  defaultContextValue,
} from './playerContext';

let playerInst: IPlayerContext['player'] | undefined;

interface Props {
  clip: any;
  currentIndex: number;
  isCurrent: boolean;
  autoplay: boolean;
  onClose?: () => void;
  isHighlight?: boolean;
}

function ClipsPlayer(props: Props) {
  const { clip, currentIndex, isCurrent, onClose, isHighlight } = props;
  const { sessionStore } = useStore();
  const { prefetched } = sessionStore;
  const [windowActive, setWindowActive] = useState(!document.hidden);
  const [contextValue, setContextValue] =
    // @ts-ignore
    useState<IPlayerContext>(defaultContextValue);
  const openedAt = React.useRef<number>();
  const [session, setSession] = useState<Session | undefined>(undefined);

  useEffect(() => {
    if (!clip.sessionId) return;

    const fetchSession = async () => {
      if (clip.sessionId != null && clip?.sessionId !== '') {
        try {
          // const data = await sessionStore.fetchSessionData(props.sessionId);
          const data = await sessionService.getSessionInfo(clip.sessionId);
          setSession(new Session(data));
        } catch (error) {
          console.error('Error fetching session data:', error);
        }
      } else {
        console.error('No sessionID in route.');
      }
    };

    void fetchSession();
  }, [clip]);

  React.useEffect(() => {
    openedAt.current = Date.now();
    if (windowActive) {
      const handleActivation = () => {
        if (!document.hidden) {
          setWindowActive(true);
          document.removeEventListener('visibilitychange', handleActivation);
        }
      };
      document.addEventListener('visibilitychange', handleActivation);
    }
  }, []);

  useEffect(() => {
    playerInst = undefined;
    if (!clip.sessionId || contextValue.player !== undefined || !session)
      return;

    // @ts-ignore
    sessionStore.setUserTimezone(session?.timezone);
    const [WebPlayerInst, PlayerStore] = createClipPlayer(
      session,
      (state) => makeAutoObservable(state),
      toast,
      clip.range,
    );

    setContextValue({ player: WebPlayerInst, store: PlayerStore });
    playerInst = WebPlayerInst;
    // playerInst.pause();
  }, [session]);

  const domFiles = session?.domURL?.length ?? 0;

  useEffect(() => {
    if (!prefetched && domFiles > 0) {
      playerInst?.reinit(session!);
      playerInst?.pause();
    }
  }, [session, domFiles, prefetched]);

  const { tabStates, ready } = contextValue.store?.get() || {};

  const cssLoading =
    ready && tabStates
      ? Object.values(tabStates).some(({ cssLoading }) => cssLoading)
      : true;

  useEffect(() => {
    if (ready) {
      if (!isCurrent) {
        contextValue.player?.pause();
      }
    }
  }, [ready]);

  useEffect(() => {
    contextValue.player?.jump(clip.range[0]);
    setTimeout(() => {
      contextValue.player?.play();
    }, 500);
  }, [currentIndex]);

  if (!session || !session?.sessionId) {
    return (
      <Loader
        size={75}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          height: 75,
        }}
      />
    );
  }

  return (
    <PlayerContext.Provider value={contextValue}>
      {contextValue.player ? (
        <>
          <ClipPlayerHeader
            isHighlight={isHighlight}
            onClose={onClose}
            range={clip.range}
            session={session!}
          />
          <ClipPlayerContent
            message={clip.message}
            isHighlight={isHighlight}
            autoplay={props.autoplay}
            range={clip.range}
            session={session!}
          />
        </>
      ) : (
        <Loader />
      )}
    </PlayerContext.Provider>
  );
}

export default observer(ClipsPlayer);
