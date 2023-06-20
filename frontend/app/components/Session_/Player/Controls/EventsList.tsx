import React, { useContext } from 'react';
import stl from './timeline.module.css';
import { PlayerContext } from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { getTimelinePosition } from './getTimelinePosition'

function EventsList({ scale }: { scale: number }) {
  const { store } = useContext(PlayerContext);

  const { tabStates, eventCount } = store.get();
  const events = React.useMemo(() => {
    return Object.values(tabStates)[0]?.eventList || [];
  }, [eventCount]);
  return (
    <>
      {events.map((e) => (
        <div
          /*@ts-ignore TODO */
          key={e.key}
          className={stl.event}
          style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
        />
      ))}
    </>
  );
}

export default observer(EventsList);
