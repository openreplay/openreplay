import { observer } from 'mobx-react-lite';
import React from 'react';

import CustomDragLayer from 'App/components/Session_/Player/Controls/components/CustomDragLayer';
import stl from 'App/components/Session_/Player/Controls/timeline.module.css';
import { debounce } from 'App/utils';

import spotPlayerStore from '../spotPlayerStore';
import SpotTimeTracker from './SpotTimeTracker';

function SpotTimeline() {
  const progressRef = React.useRef<HTMLDivElement>(null);
  const wasPlaying = React.useRef(false);

  const debounceSetTime = React.useMemo(
    () => debounce(spotPlayerStore.setTime, 100),
    [],
  );
  const getOffset = (x: number) => {
    const rect = progressRef.current?.getBoundingClientRect();
    return rect ? Math.min(1, Math.max(0, x / rect.width)) : 0;
  };

  const onDrag = (offset: { x: number }) => {
    if (spotPlayerStore.isPlaying) {
      wasPlaying.current = true;
      spotPlayerStore.setIsPlaying(false);
    }
    debounceSetTime(spotPlayerStore.duration * getOffset(offset.x));
  };

  const onDrop = () => {
    if (wasPlaying.current) {
      spotPlayerStore.setIsPlaying(true);
      wasPlaying.current = false;
    }
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
        <SpotTimeTracker onDrop={onDrop} />
        <CustomDragLayer onDrag={onDrag} containerRef={progressRef} />
        <div className={stl.timeline} />
      </div>
    </div>
  );
}

export default observer(SpotTimeline);
