import React, { useContext } from 'react';
import stl from './timeline.module.css';
import { PlayerContext, MobilePlayerContext } from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { getTimelinePosition } from './getTimelinePosition'

function EventsList({ scale }: { scale: number }) {
  const { store } = useContext(PlayerContext);

  const { tabStates, eventCount } = store.get();
  const events = React.useMemo(() => {
    return Object.values(tabStates)[0]?.eventList.filter(e => e.time) || [];
  }, [eventCount]);

  React.useEffect(() => {
    const hasDuplicates = events.some((e, i) => {
      return events.findIndex((el) => el.key === e.key && el.time === e.time) !== i;
    })
    if (hasDuplicates) {
      console.error('Duplicate events detected in list', events);
    }
  }, [eventCount])
  return (
    <>
      {events.map((e) => (
        <div
          /*@ts-ignore TODO */
          key={`${e.key}_${e.time}`}
          className={stl.event}
          style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
        />
      ))}
    </>
  );
}

function MobileEventsList({ scale }: { scale: number }) {
  const { store } = useContext(MobilePlayerContext);
  const { eventList } = store.get();
  const events = eventList.filter(e => e.type !== 'SWIPE')

  return (
    <>
      {events.map((e) => (
        <div
          /*@ts-ignore TODO */
          key={`${e.key}_${e.time}`}
          className={stl.event}
          style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
        />
      ))}
    </>
  );
}

export const WebEventsList = observer(EventsList);
export const MobEventsList = observer(MobileEventsList);