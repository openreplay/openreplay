import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';
import DraggableCircle from 'Components/Session_/Player/Controls/components/DraggableCircle';
import TimeTracker from 'Components/Session_/Player/Controls/TimeTracker';
import { PlayerContext } from 'Components/Session/playerContext';

function TimelineTracker({ scale, onDragEnd }: { scale: number, onDragEnd: () => void }) {
  const { store } = useContext(PlayerContext);

  const { time } = store.get();

  return (
    <>
      <DraggableCircle left={time * scale} onDrop={onDragEnd} />
      <TimeTracker scale={scale} left={time * scale} />
    </>
  );
}

export default observer(TimelineTracker);
