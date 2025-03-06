import { observer } from 'mobx-react-lite';
import React from 'react';

import CustomDragLayer from 'App/components/Session_/Player/Controls/components/CustomDragLayer';
import stl from 'App/components/Session_/Player/Controls/timeline.module.css';
import { debounce } from 'App/utils';
import cn from 'classnames';
import spotPlayerStore from '../spotPlayerStore';
import SpotTimeTracker from './SpotTimeTracker';

function SpotTimeline() {
  const progressRef = React.useRef<HTMLDivElement>(null);
  const wasPlaying = React.useRef(false);
  const [maxWidth, setMaxWidth] = React.useState(0);

  const debounceSetTime = React.useMemo(
    () => debounce(spotPlayerStore.setTime, 100),
    [],
  );
  React.useEffect(() => {
    if (progressRef.current) {
      setMaxWidth(progressRef.current.clientWidth);
    }
  }, []);
  const getOffset = (offsX: number) =>
    offsX / (progressRef.current?.clientWidth || 1);

  const onDrag = (offset: { x: number }) => {
    if (spotPlayerStore.isPlaying) {
      wasPlaying.current = true;
      spotPlayerStore.setIsPlaying(false);
    }
    const offs = getOffset(offset.x);
    const time = spotPlayerStore.duration * offs;
    debounceSetTime(time);
  };

  const onDrop = () => {
    if (wasPlaying.current) {
      spotPlayerStore.setIsPlaying(true);
      wasPlaying.current = false;
    }
  };

  const jump = (e: React.MouseEvent<HTMLDivElement>) => {
    const offs = getOffset(e.nativeEvent.offsetX);
    const time = spotPlayerStore.duration * offs;
    spotPlayerStore.setTime(time);
  };

  return (
    <div
      ref={progressRef}
      role="button"
      className={cn(stl.progress, '-mb-1')}
      onClick={jump}
    >
      <SpotTimeTracker onDrop={onDrop} />
      <CustomDragLayer minX={0} onDrag={onDrag} maxX={maxWidth} />
      <div className={stl.timeline} />
    </div>
  );
}

export default observer(SpotTimeline);
