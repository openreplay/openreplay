import React, { useContext } from 'react';
import stl from 'Components/Session_/Player/Controls/timeline.module.css';
import { PlayerContext } from 'Components/Session/playerContext';
import { getTimelinePosition } from './getTimelinePosition';
import { observer } from 'mobx-react-lite';

function SkipIntervalsList({ scale }: { scale: number }) {
  const { store } = useContext(PlayerContext);
  const { skipIntervals, skip } = store.get();

  if (!skip) return null;

  return (
    <>
      {skipIntervals.map((interval) => (
        <div
          key={interval.start}
          className={stl.skipInterval}
          style={{
            left: `${getTimelinePosition(interval.start, scale)}%`,
            width: `${(interval.end - interval.start) * scale}%`,
          }}
        />
      ))}
    </>
  );
}

export default observer(SkipIntervalsList);
