import React from 'react';
import { connectPlayer } from 'Player';
import { getStatusText } from 'Player/MessageDistributor/managers/AssistManager';
import type { MarkedTarget } from 'Player/MessageDistributor/StatedScreen/StatedScreen';
import { CallingState, ConnectionStatus, RemoteControlStatus } from 'Player/MessageDistributor/managers/AssistManager';

import AutoplayTimer from './Overlay/AutoplayTimer';
import PlayIconLayer from './Overlay/PlayIconLayer';
import LiveStatusText from './Overlay/LiveStatusText';
import Loader from './Overlay/Loader';
import ElementsMarker from './Overlay/ElementsMarker';
import RequestingWindow, { WindowType } from 'App/components/Assist/RequestingWindow';

interface Props {
  playing: boolean,
  completed: boolean,
  inspectorMode: boolean,
  loading: boolean,
  live: boolean,
  liveStatusText: string,
  concetionStatus: ConnectionStatus,
  autoplay: boolean,
  markedTargets: MarkedTarget[] | null,
  activeTargetIndex: number,
  calling: CallingState,
  remoteControl: RemoteControlStatus

  nextId: string,
  togglePlay: () => void,
  closedLive?: boolean,
  livePlay?: boolean,
}

function Overlay({
  playing,
  completed,
  inspectorMode,
  loading,
  live,
  liveStatusText,
  concetionStatus,
  autoplay,
  markedTargets,
  activeTargetIndex,
  nextId,
  togglePlay,
  closedLive,
  livePlay,
  calling,
  remoteControl,
}: Props) {
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


export default connectPlayer(state => ({
  playing: state.playing,
  loading: state.messagesLoading || state.cssLoading,
  completed: state.completed,
  autoplay: state.autoplay,
  inspectorMode: state.inspectorMode,
  live: state.live,
  liveStatusText: getStatusText(state.peerConnectionStatus),
  concetionStatus: state.peerConnectionStatus,
  markedTargets: state.markedTargets,
  activeTargetIndex: state.activeTargetIndex,
  livePlay: state.livePlay,
  calling: state.calling,
  remoteControl: state.remoteControl,
}))(Overlay);
