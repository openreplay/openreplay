import React from 'react';
import { durationFromMsFormatted } from 'App/date';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

function UxtEvent({ event }: any) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="border border-gray-lighter rounded bg-teal-light pt-2 pb-1 px-4 m-4 shadow">
        <div className="w-full flex items-center gap-2">
          <div className="bg-white rounded border border-gray-lighter px-2">
            {t('Task')}
            {event.indexNum}
          </div>
          <Tooltip title={event.description}>
            <div className="text-disabled-text underline-dashed cursor-pointer">
              {t('instructions')}
            </div>
          </Tooltip>
          <div className="color-gray-medium ml-auto">
            {durationFromMsFormatted(event.duration)}
          </div>
        </div>
        <div className="font-semibold pt-1">{event.title}</div>
      </div>
      {event.comment ? (
        <div className="border border-gray-lighter rounded bg-cyan py-2 px-4 mx-4 mb-4 shadow">
          <div className="bg-white rounded border border-gray-lighter px-2 w-fit">
            {t('Participant Response')}
          </div>
          <div>{event.comment}</div>
        </div>
      ) : null}
    </div>
  );
}

export default UxtEvent;
