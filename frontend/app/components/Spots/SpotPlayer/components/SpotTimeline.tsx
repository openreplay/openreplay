import { observer } from 'mobx-react-lite';
import React from 'react';

import stl from 'App/components/Session_/Player/Controls/timeline.module.css';

import spotPlayerStore from '../spotPlayerStore';
import SpotTimeTracker from './SpotTimeTracker';

function SpotTimeline() {
  const progressRef = React.useRef<HTMLDivElement>(null);
  const getOffset = (x: number) => {
    const rect = progressRef.current?.getBoundingClientRect();
    return rect ? Math.min(1, Math.max(0, x / rect.width)) : 0;
  };

  const jump = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    spotPlayerStore.setTime(
      spotPlayerStore.duration * getOffset(e.clientX - rect.left),
    );
  };

  return (
    <div className="relative flex flex-1 min-w-0 items-center">
      <div
        ref={progressRef}
        role="button"
        className={stl.progress}
        onClick={jump}
      >
        <SpotTimeTracker
          trackRef={progressRef}
          onSeek={(pct) =>
            spotPlayerStore.setTime((spotPlayerStore.duration * pct) / 100)
          }
        />
        <div className={stl.timeline} />
      </div>
    </div>
  );
}

export default observer(SpotTimeline);
