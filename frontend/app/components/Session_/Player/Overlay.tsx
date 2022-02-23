import React, {useEffect} from 'react';
import { connectPlayer, markTargets } from 'Player';
import { getStatusText } from 'Player/MessageDistributor/managers/AssistManager';
import type { MarkedTarget } from 'Player/MessageDistributor/StatedScreen/StatedScreen';
import { ConnectionStatus } from 'Player/MessageDistributor/managers/AssistManager';

import AutoplayTimer from './Overlay/AutoplayTimer';
import PlayIconLayer from './Overlay/PlayIconLayer';
import LiveStatusText from './Overlay/LiveStatusText';
import Loader from './Overlay/Loader';
import ElementsMarker from './Overlay/ElementsMarker';

interface Props {
  playing: boolean,
  completed: boolean,
  inspectorMode: boolean,
  messagesLoading: boolean,
  loading: boolean,
  live: boolean,
  liveStatusText: string,
  concetionStatus: ConnectionStatus,
  autoplay: boolean,
  markedTargets: MarkedTarget[] | null,
  activeTargetIndex: number,

  nextId: string,
  togglePlay: () => void,
  closedLive?: boolean
}

function Overlay({
  playing,
  completed,
  inspectorMode,
  messagesLoading,
  loading,
  live,
  liveStatusText,
  concetionStatus,
  autoplay,
  markedTargets,
  activeTargetIndex,
  nextId,
  togglePlay,
  closedLive
}: Props) {

  // useEffect(() =>{
  //   setTimeout(() => markTargets([{ selector: 'div', count:6}]), 5000)
  //   setTimeout(() => markTargets(null), 8000)
  // },[])
  
  const showAutoplayTimer = !live && completed && autoplay && nextId
  const showPlayIconLayer = !live && !markedTargets && !inspectorMode && !loading && !showAutoplayTimer;
  const showLiveStatusText = live && liveStatusText && !loading;

  return (
    <>
      { showAutoplayTimer && <AutoplayTimer /> }
      { showLiveStatusText && 
        <LiveStatusText text={liveStatusText} concetionStatus={closedLive ? ConnectionStatus.Closed : concetionStatus} />
      }
      { messagesLoading && <Loader/> }
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
  messagesLoading: state.messagesLoading,
  loading: state.messagesLoading || state.cssLoading,
  completed: state.completed,
  autoplay: state.autoplay,
  inspectorMode: state.inspectorMode,
  live: state.live,
  liveStatusText: getStatusText(state.peerConnectionStatus),
  concetionStatus: state.peerConnectionStatus,
  markedTargets: state.markedTargets,
  activeTargetIndex: state.activeTargetIndex,
}))(Overlay);