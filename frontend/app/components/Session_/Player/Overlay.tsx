import React from 'react';
import AutoplayTimer from './Overlay/AutoplayTimer';
import PlayIconLayer from './Overlay/PlayIconLayer';
import Loader from './Overlay/Loader';
import ElementsMarker from './Overlay/ElementsMarker';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

interface Props {
  nextId?: string,
  closedLive?: boolean,
  isClickmap?: boolean,
}

function Overlay({
  nextId,
  isClickmap,
}: Props) {
  const { player, store } = React.useContext(PlayerContext)

  const togglePlay = () => player.togglePlay()
  const {
    playing,
    messagesLoading,
    completed,
    autoplay,
    inspectorMode,
    markedTargets,
    activeTargetIndex,
    tabStates,
  } = store.get()
  const cssLoading = Object.values(tabStates).some(({ cssLoading }) => cssLoading)
  const loading = messagesLoading || cssLoading

  const showAutoplayTimer = completed && autoplay && nextId
  const showPlayIconLayer = !isClickmap && !markedTargets && !inspectorMode && !loading && !showAutoplayTimer;

  return (
    <>
      {showAutoplayTimer && <AutoplayTimer />}
      {loading ? <Loader /> : null}
      {showPlayIconLayer && <PlayIconLayer playing={playing} togglePlay={togglePlay} />}
      {markedTargets && <ElementsMarker targets={markedTargets} activeIndex={activeTargetIndex} />}
    </>
  );
}

export default observer(Overlay);
