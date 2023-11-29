import React from 'react'
import { durationFromMsFormatted } from "App/date";

function UtxEvent({ event }: any) {
  return (
    <div className={'flex flex-col'}>
      <div className={'border border-gray-light rounded bg-teal-light py-2 px-4 m-4 shadow'}>
        <div className={'w-full flex items-center justify-between'}>
          <div className={'bg-white rounded border border-gray-light px-2'}>{event.title}</div>
          <div className={'color-gray-medium'}>{durationFromMsFormatted(event.duration)}</div>
        </div>
        {event.description && <div className="font-semibold">{event.description}</div>}
      </div>
      {event.comment ? (
        <div className={'border border-gray-light rounded bg-cyan py-2 px-4 mx-4 mb-4 shadow'}>
          <div className={'bg-white rounded border border-gray-light px-2 w-fit'}>
            Participant Response
          </div>
          <div>{event.comment}</div>
        </div>
      ) : null}
    </div>
  );
}

export default UtxEvent