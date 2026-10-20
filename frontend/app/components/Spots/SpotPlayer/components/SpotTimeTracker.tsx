import { observer } from 'mobx-react-lite';
import React, { type RefObject, useRef, useState } from 'react';

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
  // the video holds still while the playhead is held, and goes on after
  const resume = useRef(false);
  const letGo = () => {
    if (resume.current) spotPlayerStore.setIsPlaying(true);
    resume.current = false;
  };

  return (
    <>
      <DraggableCircle
        left={left}
        trackRef={trackRef}
        onScrub={(pct) => {
          if (pct != null && held == null && spotPlayerStore.isPlaying) {
            resume.current = true;
            spotPlayerStore.setIsPlaying(false);
          }
          if (pct == null) letGo();
          setHeld(pct);
        }}
        onRelease={(pct) => {
          onSeek(pct);
          setHeld(null);
          letGo();
        }}
      />
      <ProgressBar scale={1} live={false} left={left} />
    </>
  );
}

export default observer(SpotTimeTracker);
