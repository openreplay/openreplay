import { CalendarFold, ChevronRight } from 'lucide-react';
import React from 'react';

import { formatTs } from 'App/date';
import { getLocalHourFormat } from 'App/utils/intlUtils';
import { getEventIcon } from 'Components/DataManagement/Activity/getEventIcon';

function EventsByDay({
  byDays,
  onItemClick,
  getName,
}: {
  byDays: Record<string, any[]>;
  onItemClick: (ev: any) => void;
  getName: (evName: string) => string;
}) {
  return (
    <>
      {Object.keys(byDays).map((date) => (
        <div className={'flex flex-col'}>
          <div
            className={
              'bg-gray-lightest px-4 py-2 border font-semibold flex items-center gap-2'
            }
          >
            <CalendarFold size={16} />
            <span>{date}</span>
          </div>
          {byDays[date].map((ev) => (
            <div
              onClick={() => onItemClick(ev)}
              className={
                'hover:bg-active-blue border-b cursor-pointer px-4 py-2 flex items-center group gap-2'
              }
            >
              <div className={'w-56 color-disabled-text'}>
                {formatTs(ev.created_at, getLocalHourFormat())}
              </div>
              <div>{getEventIcon(ev.isAutoCapture, ev.event_name)}</div>
              <div className={'font-mono'}>{getName(ev.event_name)}</div>
              <div className={'hidden group-hover:block ml-auto'}>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

export default EventsByDay;
