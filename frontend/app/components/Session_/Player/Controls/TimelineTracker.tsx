import { observer } from 'mobx-react-lite';
import React, { type RefObject, useContext, useState } from 'react';

import { PlayerContext } from 'Components/Session/playerContext';
import TimeTracker from 'Components/Session_/Player/Controls/TimeTracker';
import DraggableCircle from 'Components/Session_/Player/Controls/components/DraggableCircle';

function TimelineTracker({
  scale,
  trackRef,
  onScrub,
  onSeek,
}: {
  scale: number;
  trackRef: RefObject<HTMLElement | null>;
  /** where the held playhead is, in percent; null once let go */
  onScrub?: (pct: number | null) => void;
  /** the playhead was let go here, in percent of the bar */
  onSeek: (pct: number) => void;
}) {
  const { store } = useContext(PlayerContext);
  const { time, playing } = store.get();
  // while held, the handle and the played part follow the pointer, not the player
  const [held, setHeld] = useState<number | null>(null);
  const left = held ?? time * scale;

  return (
    <>
      <DraggableCircle
        paused={!playing}
        left={left}
        trackRef={trackRef}
        onScrub={(pct) => {
          setHeld(pct);
          onScrub?.(pct);
        }}
        onRelease={(pct) => {
          onSeek(pct);
          setHeld(null);
          onScrub?.(null);
        }}
      />
      <TimeTracker scale={scale} left={left} />
    </>
  );
}

export default observer(TimelineTracker);
