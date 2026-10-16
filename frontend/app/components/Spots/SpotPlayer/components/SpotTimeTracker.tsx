import { observer } from 'mobx-react-lite';
import React, { type RefObject, useState } from 'react';

import { ProgressBar } from 'App/player-ui';
import DraggableCircle from 'Components/Session_/Player/Controls/components/DraggableCircle';

import spotPlayerStore from '../spotPlayerStore';

function SpotTimeTracker({
  trackRef,
  onSeek,
}: {
  trackRef: RefObject<HTMLElement | null>;
  /** the playhead was let go here, in percent of the bar */
  onSeek: (pct: number) => void;
}) {
  const [held, setHeld] = useState<number | null>(null);
  const left = held ?? (spotPlayerStore.time / spotPlayerStore.duration) * 100;

  return (
    <>
      <DraggableCircle
        left={left}
        trackRef={trackRef}
        onScrub={setHeld}
        onRelease={(pct) => {
          onSeek(pct);
          setHeld(null);
        }}
      />
      <ProgressBar scale={1} live={false} left={left} />
    </>
  );
}

export default observer(SpotTimeTracker);
