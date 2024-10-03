import React, { useEffect, useState } from 'react';
import { createClickMapPlayer } from 'Player';
import { makeAutoObservable } from 'mobx';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import PlayerContent from './ThinPlayerContent';
import { IPlayerContext, PlayerContext, defaultContextValue } from '../../playerContext';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify'
import { useStore } from 'App/mstore';

function WebPlayer(props: any) {
  const { sessionStore } = useStore();
  const insights = sessionStore.insights;
  const {
    session,
    jumpTimestamp,
  } = props;
  // @ts-ignore
  const [contextValue, setContextValue] = useState<IPlayerContext>(defaultContextValue);
  const playerRef = React.useRef<any>(null);

  useEffect(() => {
    const init = () => {
      const [WebPlayerInst, PlayerStore] = createClickMapPlayer(
        session,
        (state) => makeAutoObservable(state),
        toast,
      );
      playerRef.current = WebPlayerInst;
      setContextValue({ player: WebPlayerInst, store: PlayerStore });
    }

    if (!playerRef.current) {
      init()
    } else {
      playerRef.current.clean()
      playerRef.current = null;
      setContextValue(defaultContextValue);
      init();
    }
  }, [session.sessionId]);

  React.useEffect(() => {
    return () => {
      playerRef.current && playerRef.current.clean();
      playerRef.current = null;
      // @ts-ignore
      setContextValue(defaultContextValue);
    }
  }, [])

  const isPlayerReady = contextValue.store?.get().ready

  React.useEffect(() => {
      contextValue.player && contextValue.player.play()
    if (isPlayerReady && insights.size > 0 && jumpTimestamp) {
      setTimeout(() => {
        contextValue.player.pause()
        contextValue.player.jump(jumpTimestamp)
        contextValue.player.scale()

        setTimeout(() => { contextValue.player.showClickmap(insights) }, 250)
      }, 500)
    }
    return () => {
      isPlayerReady && contextValue.player.showClickmap(null)
    }
  }, [insights, isPlayerReady, jumpTimestamp])

  if (!contextValue.player || !session) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
        <PlayerContent />
    </PlayerContext.Provider>
  );
}

export default withLocationHandlers()(observer(WebPlayer));
