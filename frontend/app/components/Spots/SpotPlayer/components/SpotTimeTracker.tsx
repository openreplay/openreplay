import DraggableCircle from 'Components/Session_/Player/Controls/components/DraggableCircle';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { ProgressBar } from 'App/player-ui';
import spotPlayerStore from '../spotPlayerStore';

function SpotTimeTracker({ onDrop }: { onDrop: () => void }) {
  const leftPercent = (spotPlayerStore.time / spotPlayerStore.duration) * 100;

  return (
    <>
      <DraggableCircle left={leftPercent} onDrop={onDrop} />
      <ProgressBar
        scale={1}
        live={false}
        left={leftPercent}
        time={leftPercent}
      />
    </>
  );
}

export default observer(SpotTimeTracker);
