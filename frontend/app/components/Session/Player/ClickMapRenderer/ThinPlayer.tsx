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
    customSession,
    insights,
    jumpTimestamp,
    onMarkerClick,
  } = props;
  // @ts-ignore
  const [contextValue, setContextValue] = useState<IPlayerContext>(defaultContextValue);

  useEffect(() => {
    const [WebPlayerInst, PlayerStore] = createClickMapPlayer(
      customSession,
      (state) => makeAutoObservable(state),
      toast,
    );
    setContextValue({ player: WebPlayerInst, store: PlayerStore });

    return () => {
      WebPlayerInst.clean();
      // @ts-ignore
      setContextValue(defaultContextValue);
    }
  }, [session.sessionId]);

  const isPlayerReady = contextValue.store?.get().ready

  React.useEffect(() => {
    contextValue.player && contextValue.player.play()
    if (isPlayerReady && insights.size > 0) {
      setTimeout(() => {
        contextValue.player.pause()
        contextValue.player.jump(jumpTimestamp)
        contextValue.player.scale()
        setTimeout(() => { contextValue.player.showClickmap(insights, onMarkerClick) }, 250)
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
    session: state.getIn(['sessions', 'current']),
    insights: state.getIn(['sessions', 'insights']),
    jwt: state.getIn(['user', 'jwt']),
  })
)(withLocationHandlers()(observer(WebPlayer)));
