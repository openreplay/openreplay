import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';
import DraggableCircle from 'Components/Session_/Player/Controls/components/DraggableCircle';
import { PlayerContext } from 'Components/Session/playerContext';
import TimeTracker from 'Components/Session/Player/ClipPlayer/TimeTracker';

function TimelineTracker({
  scale,
  onDragEnd,
}: {
  scale: number;
  onDragEnd: () => void;
}) {
  const { store } = useContext(PlayerContext);
  const { time, range } = store.get();
  const adjustedTime = time - range[0];

  return (
    <>
      <DraggableCircle left={adjustedTime * scale} onDrop={onDragEnd} />
      <TimeTracker scale={scale} left={(adjustedTime - range[0]) * scale} />
    </>
  );
}

export default observer(TimelineTracker);
