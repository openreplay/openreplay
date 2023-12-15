import React from 'react'
import { durationFromMsFormatted } from "App/date";
import { Tooltip } from 'antd'

function UxtEvent({ event }: any) {
  return (
    <div className={'flex flex-col'}>
      <div className={'border border-gray-light rounded bg-teal-light pt-2 pb-1 px-4 m-4 shadow'}>
        <div className={'w-full flex items-center gap-2'}>
          <div className={'bg-white rounded border border-gray-light px-2'}>Task {event.indexNum}</div>
          <Tooltip title={event.description}>
            <div className={'text-disabled-text underline-dashed cursor-pointer'}>instructions</div>
          </Tooltip>
          <div className={'color-gray-medium ml-auto'}>{durationFromMsFormatted(event.duration)}</div>
        </div>
        <div className="font-semibold pt-1">{event.title}</div>
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

export default UxtEvent