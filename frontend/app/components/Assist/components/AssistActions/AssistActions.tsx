import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { ConnectionStatus } from 'Player';
import { PlayerContext, ILivePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import ScreenRecorder from 'App/components/Session_/ScreenRecorder/ScreenRecorder';

function AssistActions() {
  // @ts-ignore ???
  const { player, store } = React.useContext<ILivePlayerContext>(PlayerContext)

  const {
    assistManager: {
      toggleAnnotation,
    },
  } = player;
  const {
    annotating,
    peerConnectionStatus,
    livePlay,
  } = store.get()

  useEffect(() => {
    if (!livePlay) {
      if (annotating) {
        toggleAnnotation(false);
      }
    }
  }, [livePlay]);

  useEffect(() => {
    if (peerConnectionStatus == ConnectionStatus.Disconnected) {
      toast.info(`Live session was closed.`);
    }
  }, [peerConnectionStatus]);

  return (
    <div className="flex items-center">
      <ScreenRecorder />
    </div>
  );
}

const con = connect((state: any) => {
  return {
    isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
  };
});

export default con(
  observer(AssistActions)
);
