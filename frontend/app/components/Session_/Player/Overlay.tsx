import React from 'react';
import { getStatusText } from 'Player';
import { CallingState, ConnectionStatus, RemoteControlStatus } from 'Player';

import AutoplayTimer from './Overlay/AutoplayTimer';
import PlayIconLayer from './Overlay/PlayIconLayer';
import LiveStatusText from './Overlay/LiveStatusText';
import Loader from './Overlay/Loader';
import ElementsMarker from './Overlay/ElementsMarker';
import RequestingWindow, { WindowType } from 'App/components/Assist/RequestingWindow';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

interface Props {
  nextId: string,
  closedLive?: boolean,
}

function Overlay({
  nextId,
  closedLive,
}: Props) {
  const { player, store } = React.useContext(PlayerContext)

  const togglePlay = () => player.togglePlay()
  const {
    playing,
    messagesLoading,
    cssLoading,
    completed,
    autoplay,
    inspectorMode,
    live,
    peerConnectionStatus,
    markedTargets,
    activeTargetIndex,
    livePlay,
    calling,
    remoteControl,
  } = store.get()
  const loading = messagesLoading || cssLoading
  const liveStatusText = getStatusText(peerConnectionStatus)
  const concetionStatus = peerConnectionStatus

  const showAutoplayTimer = !live && completed && autoplay && nextId
  const showPlayIconLayer = !live && !markedTargets && !inspectorMode && !loading && !showAutoplayTimer;
  const showLiveStatusText = live && livePlay && liveStatusText && !loading;

  const showRequestWindow = live && (calling === CallingState.Connecting || remoteControl === RemoteControlStatus.Requesting)
  const requestWindowType = calling === CallingState.Connecting ? WindowType.Call : remoteControl === RemoteControlStatus.Requesting ? WindowType.Control : null

  return (
    <>
      {showRequestWindow ? <RequestingWindow type={requestWindowType} /> : null}
      { showAutoplayTimer && <AutoplayTimer /> }
      { showLiveStatusText &&
        <LiveStatusText text={liveStatusText} concetionStatus={closedLive ? ConnectionStatus.Closed : concetionStatus} />
      }
      { loading ? <Loader /> : null }
      { showPlayIconLayer &&
        <PlayIconLayer playing={playing} togglePlay={togglePlay} />
      }
      { markedTargets && <ElementsMarker targets={ markedTargets } activeIndex={activeTargetIndex}/>
      }
    </>
  );
}


export default observer(Overlay);
