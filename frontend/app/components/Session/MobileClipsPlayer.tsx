import { createClipPlayer } from 'Player';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { Loader } from 'UI';

import ClipPlayerHeader from 'Components/Session/Player/ClipPlayer/ClipPlayerHeader';
import MobileClipPlayerContent from 'Components/Session/Player/ClipPlayer/MobileClipPlayerContent';
import Session from 'Types/session';
import { sessionService } from '@/services';
import {
  IOSPlayerContext,
  MobilePlayerContext,
  defaultContextValue,
} from './playerContext';

let playerInst: IOSPlayerContext['player'] | undefined;

interface Props {
  clip: any;
  currentIndex: number;
  isCurrent: boolean;
  autoplay: boolean;
  onClose?: () => void;
  isHighlight?: boolean;
}

function MobileClipsPlayer(props: Props) {
  const { clip, currentIndex, isCurrent, onClose, isHighlight } = props;
  const { sessionStore } = useStore();
  const [windowActive, setWindowActive] = useState(!document.hidden);
  const [contextValue, setContextValue] =
    // @ts-ignore
    useState<IOSPlayerContext>(defaultContextValue);
  const openedAt = React.useRef<number>();
  const [session, setSession] = useState<Session | undefined>(undefined);

  useEffect(() => {
    if (!clip.sessionId) return;

    const fetchSession = async () => {
      if (clip.sessionId != null && clip?.sessionId !== '') {
        try {
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
    const [PlayerInst, PlayerStore] = createClipPlayer(
      session,
      (state) => makeAutoObservable(state),
      toast,
      clip.range,
      true,
    );

    setContextValue({ player: PlayerInst, store: PlayerStore });
    playerInst = PlayerInst;
    // playerInst.pause();
  }, [session]);

  const { ready } = contextValue.store?.get() || {};

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
    <MobilePlayerContext.Provider value={contextValue}>
      {contextValue.player ? (
        <>
          <ClipPlayerHeader
            isHighlight={isHighlight}
            onClose={onClose}
            range={clip.range}
            session={session!}
          />
          <MobileClipPlayerContent
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
    </MobilePlayerContext.Provider>
  );
}

export default observer(MobileClipsPlayer);
