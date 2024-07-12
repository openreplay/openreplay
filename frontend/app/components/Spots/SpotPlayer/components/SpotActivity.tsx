import { TYPES } from 'Types/session/event';
import { X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import Event from 'Components/Session_/EventsBlock/Event';

import spotPlayerStore from '../spotPlayerStore';

function SpotActivity({ onClose }: { onClose: () => void }) {
  const mixedEvents = React.useMemo(() => {
    const result = [...spotPlayerStore.locations, ...spotPlayerStore.clicks];
    return result.sort((a, b) => a.time - b.time);
  }, [spotPlayerStore.locations, spotPlayerStore.clicks]);

  const { index } = spotPlayerStore.getHighlightedEvent(
    spotPlayerStore.time,
    mixedEvents
  );
  const jump = (time: number) => {
    spotPlayerStore.setTime(time);
  };
  return (
    <div
      className={'h-full bg-white border border-gray-light'}
      style={{ minWidth: 320, width: 320 }}
    >
      <div className={'flex items-center justify-between p-4'}>
        <div className={'font-semibold'}>Activity</div>
        <div onClick={onClose} className={'p-1 cursor-pointer'}>
          <X size={16} />
        </div>
      </div>
      <div
        className={'overflow-y-auto'}
        style={{ maxHeight: 'calc(100vh - 128px)' }}
      >
        {mixedEvents.map((event, i) => (
          <div onClick={() => jump(event.time)}>
            {'label' in event ? (
              // @ts-ignore
              <ClickEv key={event.time} event={event} isCurrent={i === index} />
            ) : (
              <LocationEv
                key={event.time}
                event={event}
                isCurrent={i === index}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationEv({
  event,
  isCurrent,
}: {
  event: { time: number; location: string };
  isCurrent?: boolean;
}) {
  const locEvent = { type: TYPES.LOCATION, url: event.location };
  return <Event whiteBg event={locEvent} isCurrent={isCurrent} />;
}

function ClickEv({
  event,
  isCurrent,
}: {
  event: { time: number; label: string };
  isCurrent?: boolean;
}) {
  const clickEvent = {
    type: TYPES.CLICK,
    label: event.label,
    count: 1,
  };
  return <Event whiteBg event={clickEvent} isCurrent={isCurrent} />;
}

export default observer(SpotActivity);
