import React, {useEffect} from 'react';
import { connectPlayer, markTargets } from 'Player';
import { getStatusText } from 'Player/MessageDistributor/managers/AssistManager';
import type { MarkedTarget } from 'Player/MessageDistributor/StatedScreen/StatedScreen';

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
  autoplay: boolean,
  markedTargets: MarkedTarget[] | null,

  nextId: string,
  togglePlay: () => void,
}

function Overlay({
  playing,
  completed,
  inspectorMode,
  messagesLoading,
  loading,
  live,
  liveStatusText,
  autoplay,
  markedTargets,

  nextId,
  togglePlay,
}: Props) {

  useEffect(() =>{
    setTimeout(() => markTargets([{ selector: 'div', count:6}]), 5000)
    setTimeout(() => markTargets(null), 8000)
  },[])
  
  const showAutoplayTimer = !live && completed && autoplay && nextId
  const showPlayIconLayer = !live && !markedTargets && !inspectorMode && !loading && !showAutoplayTimer;
  const showLiveStatusText = live && liveStatusText && !loading;

  return (
    <>
      { showAutoplayTimer && <AutoplayTimer /> }
      { showLiveStatusText && 
        <LiveStatusText text={liveStatusText} />
      }
      { messagesLoading && <Loader/> }
      { showPlayIconLayer && 
        <PlayIconLayer playing={playing} togglePlay={togglePlay} />
      }
      { markedTargets && <ElementsMarker targets={ markedTargets } />
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
  live: state.live,
  liveStatusText: getStatusText(state.peerConnectionStatus),
  markedTargets: state.markedTargets
}))(Overlay);