import { X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import spotPlayerStore from '../spotPlayerStore';

function SpotActivity({ onClose }: { onClose: () => void }) {
  const mixedEvents = React.useMemo(() => {
    const result = [...spotPlayerStore.locations, ...spotPlayerStore.clicks];
    return result.sort((a, b) => a.time - b.time);
  }, [spotPlayerStore.locations, spotPlayerStore.clicks]);

  return (
    <div
      className={'h-full p-4 bg-white border border-gray-light'}
      style={{ width: 320 }}
    >
      <div className={'flex items-center justify-between'}>
        <div className={'font-semibold'}>Activity</div>
        <div onClick={onClose} className={'p-1 cursor-pointer'}>
          <X size={16} />
        </div>
      </div>
      <div className={'overflow-y-auto'} style={{ maxHeight: 'calc(100vh - 124px)' }}>
        {mixedEvents.map((event) => (
          <div key={event.time} className={'my-4 flex flex-col gap-2'}>
            <div className={'flex items-center gap-2'}>
              {event.label ? (
                <>
                  <div>c</div>
                  <div className={'text-disabled-text'}>Clicked</div>
                  <div
                    className={'whitespace-nowrap overflow-ellipsis overflow-hidden'}
                    style={{ maxWidth: 170 }}
                  >
                    {event.label}
                  </div>
                </>
              ) : (
                <>
                  <div>l</div>
                  <div className={'text-disabled-text'}>Visited</div>
                  <div
                    className={'whitespace-nowrap overflow-ellipsis overflow-hidden'}
                    style={{ maxWidth: 170 }}
                  >
                    {event.location}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default observer(SpotActivity);
