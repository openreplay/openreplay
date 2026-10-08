import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';

import { PlayerContext } from 'Components/Session/playerContext';
import TimeTracker from 'Components/Session_/Player/Controls/TimeTracker';
import DraggableCircle from 'Components/Session_/Player/Controls/components/DraggableCircle';

function TimelineTracker({
  scale,
  onDragEnd,
}: {
  scale: number;
  onDragEnd: () => void;
}) {
  const { store } = useContext(PlayerContext);

  const { time, playing } = store.get();

  return (
    <>
      <DraggableCircle
        paused={!playing}
        left={time * scale}
        onDrop={onDragEnd}
      />
      <TimeTracker scale={scale} left={time * scale} />
    </>
  );
}

export default observer(TimelineTracker);
