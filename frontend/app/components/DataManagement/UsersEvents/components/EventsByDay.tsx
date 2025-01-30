import React from 'react';
import { formatTs } from 'App/date';
import { CalendarFold, ChevronRight } from 'lucide-react';

function EventsByDay({
  byDays,
  onItemClick,
}: {
  byDays: Record<string, any[]>;
  onItemClick: (ev: any) => void;
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
                'hover:bg-gray-lightest border-b cursor-pointer px-4 py-2 flex items-center group'
              }
            >
              <div className={'w-56'}>{formatTs(ev.time, 'HH:mm:ss a')}</div>
              <div>{ev.name}</div>
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
