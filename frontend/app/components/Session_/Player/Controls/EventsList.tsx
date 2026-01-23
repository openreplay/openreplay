import React, { useContext } from 'react';
import {
  PlayerContext,
  MobilePlayerContext,
} from 'Components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { getTimelinePosition } from './getTimelinePosition';
import { useStore } from '@/mstore';
import { getTimelineEventWidth } from './getTimelineEventWidth';
import { Tooltip } from 'antd';

function EventsList() {
  const { store } = useContext(PlayerContext);
  const { uiPlayerStore, sessionStore } = useStore();
  const { eventCount, endTime, tabStates, sessionStart } = store.get();
  const { incidents } = sessionStore.current;

  const scale = 100 / endTime;
  const events = React.useMemo(
    () =>
      Object.values(tabStates)[0]?.eventList.filter((e) => {
        if (uiPlayerStore.showOnlySearchEvents) {
          return e.time && (e as any).isHighlighted;
        } else {
          return e.time;
        }
      }) || [],
    [eventCount, uiPlayerStore.showOnlySearchEvents],
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
          className={`absolute w-[2px] h-[10px] z-4 pointer-events-none ${e.isHighlighted ? 'bg-[#f0a930]' : 'bg-[#394eff]'}`}
          style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
        />
      ))}
      {incidents?.map((i) => {
        const width = getTimelineEventWidth(
          endTime,
          (i as any).time,
          (i as any).endTime - sessionStart,
        );
        return (
          <Tooltip title={i.label} key={(i as any).startTime}>
            <div
              /* @ts-ignore TODO */
              className={`absolute h-[10px] z-3 bg-[#ff5454]`}
              style={{
                left: `${getTimelinePosition((i as any).time, scale)}%`,
                width: typeof width === 'string' ? width : `${width}%`,
              }}
            />
          </Tooltip>
        );
      })}
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
          className={`absolute w-[2px] h-[10px] z-3 pointer-events-none ${e.isHighlighted ? 'bg-[#f0a930]' : 'bg-[#394eff]'}`}
          style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
        />
      ))}
    </>
  );
}

export const WebEventsList = observer(EventsList);
export const MobEventsList = observer(MobileEventsList);
