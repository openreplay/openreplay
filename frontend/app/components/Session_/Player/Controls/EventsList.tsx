import React, { useContext } from 'react';
import {
  PlayerContext,
  MobilePlayerContext,
} from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import stl from './timeline.module.css';
import { getTimelinePosition } from './getTimelinePosition';
import { useStore } from '@/mstore';

function EventsList() {
  const { store } = useContext(PlayerContext);
  const { uiPlayerStore } = useStore();

  const { eventCount, endTime } = store.get();
  const { tabStates } = store.get();
  const scale = 100 / endTime;
  const events = React.useMemo(
    () => Object.values(tabStates)[0]?.eventList.filter((e) => e.time) || [],
    [eventCount],
  );
  React.useEffect(() => {
    const hasDuplicates = events.some(
      (e, i) =>
        events.findIndex((el) => el.key === e.key && el.time === e.time) !== i,
    );
    if (hasDuplicates) {
      console.error('Duplicate events detected in list', events);
    }
  }, [eventCount]);
  return (
    <>
      {events.map((e) => (
        <div
          /* @ts-ignore TODO */
          key={`${e.key}_${e.time}`}
          className={stl.event}
          style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
        />
      ))}
    </>
  );
}

function MobileEventsList() {
  const { store } = useContext(MobilePlayerContext);
  const { eventList, endTime } = store.get();
  const events = eventList.filter((e) => e.type !== 'SWIPE');

  const scale = 100 / endTime;
  return (
    <>
      {events.map((e) => (
        <div
          /* @ts-ignore TODO */
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
