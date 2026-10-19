import { useStore } from '@/mstore';
import { Tooltip } from '@/ui/overlays/tooltip';
import { TYPES } from 'Types/session/event';
import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';

import {
  MobilePlayerContext,
  PlayerContext,
} from 'Components/Session/playerContext';

import { getTimelineEventWidth } from './getTimelineEventWidth';
import { getTimelinePosition } from './getTimelinePosition';
import stl from './timeline.module.css';

const RAGE = new Set<string>([TYPES.CLICKRAGE, TYPES.TAPRAGE]);

/** One event on the track: its kind in height and colour, a click jumps to it. */
function Tick({
  e,
  scale,
  onJump,
}: {
  e: { time: number; type?: string; isHighlighted?: boolean };
  scale: number;
  onJump: (time: number) => void;
}) {
  const kind = e.isHighlighted
    ? stl.tickHit
    : RAGE.has(e.type ?? '')
      ? stl.tickRage
      : '';
  return (
    <div
      className={`${stl.tick} ${kind}`}
      style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
      onClick={(ev) => {
        ev.stopPropagation();
        onJump(e.time);
      }}
    />
  );
}

function EventsList() {
  const { store, player } = useContext(PlayerContext);
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
        <Tick
          /* @ts-ignore TODO */
          key={`${e.key}_${e.time}`}
          e={e as any}
          scale={scale}
          onJump={player.jump}
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
              className={`absolute h-[10px] z-3 bg-[var(--m-mark-danger)]`}
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
  const { store, player } = useContext(MobilePlayerContext);
  const { eventList, endTime } = store.get();
  const events = eventList.filter((e) => e.type !== 'SWIPE');

  const scale = 100 / endTime;
  return (
    <>
      {events.map((e) => (
        <Tick
          /* @ts-ignore TODO */
          key={`${e.key}_${e.time}`}
          e={e as any}
          scale={scale}
          onJump={player.jump}
        />
      ))}
    </>
  );
}

export const WebEventsList = observer(EventsList);
export const MobEventsList = observer(MobileEventsList);
