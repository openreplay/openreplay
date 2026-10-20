import { observer } from 'mobx-react-lite';
import React, { type RefObject, useContext, useRef, useState } from 'react';

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
  const { store, player } = useContext(PlayerContext);
  const { time, playing } = store.get();
  // while held, the handle and the played part follow the pointer, not the player
  const [held, setHeld] = useState<number | null>(null);
  const left = held ?? time * scale;
  // the replay holds still while the playhead is held, and goes on after
  const resume = useRef(false);
  const letGo = () => {
    if (resume.current) player.play();
    resume.current = false;
  };

  return (
    <>
      <DraggableCircle
        paused={!playing}
        left={left}
        trackRef={trackRef}
        onScrub={(pct) => {
          if (pct != null && held == null && playing) {
            resume.current = true;
            player.pause();
          }
          if (pct == null) letGo();
          setHeld(pct);
          onScrub?.(pct);
        }}
        onRelease={(pct) => {
          onSeek(pct);
          setHeld(null);
          onScrub?.(null);
          letGo();
        }}
      />
      <TimeTracker scale={scale} left={left} />
    </>
  );
}

export default observer(TimelineTracker);
