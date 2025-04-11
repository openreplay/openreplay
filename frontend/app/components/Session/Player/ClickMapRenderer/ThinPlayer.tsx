import React, { useEffect, useState } from 'react';
import { createClickMapPlayer } from 'Player';
import { makeAutoObservable } from 'mobx';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore';
import {
  IPlayerContext,
  PlayerContext,
  defaultContextValue,
} from '../../playerContext';
import PlayerContent from './ThinPlayerContent';

function WebPlayer(props: any) {
  const { sessionStore } = useStore();
  const { insights } = sessionStore;
  const { session, jumpTimestamp } = props;
  // @ts-ignore
  const [contextValue, setContextValue] =
    useState<IPlayerContext>(defaultContextValue);
  const playerRef = React.useRef<any>(null);
  const insightsSize = React.useRef(0);

  useEffect(() => {
    const init = () => {
      const [WebPlayerInst, PlayerStore] = createClickMapPlayer(
        session,
        (state) => makeAutoObservable(state),
        toast,
      );
      playerRef.current = WebPlayerInst;
      setContextValue({ player: WebPlayerInst, store: PlayerStore });
    };

    if (!playerRef.current) {
      init();
    } else {
      playerRef.current.clean();
      playerRef.current = null;
      setContextValue(defaultContextValue);
      init();
    }
  }, [session.sessionId]);

  React.useEffect(
    () => () => {
      playerRef.current && playerRef.current.clean();
      playerRef.current = null;
      // @ts-ignore
      setContextValue(defaultContextValue);
    },
    [],
  );

  const isPlayerReady = contextValue.store?.get().ready;

  React.useEffect(() => {
    contextValue.player && contextValue.player.play();
    if (
      isPlayerReady &&
      insights.length > 0 &&
      jumpTimestamp &&
      insightsSize.current !== insights.length
    ) {
      insightsSize.current = insights.length;
      setTimeout(() => {
        contextValue.player.pause();
        contextValue.player.jump(jumpTimestamp);
        setTimeout(() => {
          contextValue.player.scale();
          contextValue.player.showClickmap(insights);
        }, 250);
      }, 250);
    }
  }, [insights, isPlayerReady, jumpTimestamp]);

  if (!contextValue.player || !session) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
      <PlayerContent />
    </PlayerContext.Provider>
  );
}

export default withLocationHandlers()(observer(WebPlayer));
