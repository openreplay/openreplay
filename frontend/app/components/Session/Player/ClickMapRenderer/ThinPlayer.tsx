import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { createClickMapPlayer } from 'Player';
import { makeAutoObservable } from 'mobx';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import PlayerContent from './ThinPlayerContent';
import { IPlayerContext, PlayerContext, defaultContextValue } from '../../playerContext';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify'

function WebPlayer(props: any) {
  const {
    session,
    insights,
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
    if (isPlayerReady && insights.size > 0) {
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

export default connect(
  (state: any) => ({
    insights: state.getIn(['sessions', 'insights']),
    jwt: state.getIn(['user', 'jwt']),
  })
)(withLocationHandlers()(observer(WebPlayer)));
