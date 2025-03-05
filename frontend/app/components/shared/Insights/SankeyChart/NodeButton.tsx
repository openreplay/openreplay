import React from 'react';
import { Icon } from 'UI';
import { Popover } from 'antd';
import cn from 'classnames';
import { IconMap } from '../../Filters/FilterModal/FilterModal';
import { useTranslation } from 'react-i18next';

interface Props {
  payload: any;
}

function NodeButton(props: Props) {
  const { payload } = props;
  const { t } = useTranslation();

  const payloadStr = payload.name ?? payload.eventType;

  // we need to only trim the middle, so its readable
  const safePName =
    payloadStr.length > 70
      ? `${payloadStr.slice(0, 25)}...${payloadStr.slice(-25)}`
      : payloadStr;

  const eventIcon = IconMap[payload.eventType.toLowerCase()] ?? (
    <Icon name="link-45deg" size={18} />
  );
  return (
    <div className="relative">
      <Popover
        content={
          <div className="bg-white rounded mt-1 text-xs">
            <div className="border-b py-1 px-2 flex items-center gap-1">
              {eventIcon}
              <div
                className={cn(
                  'text-ellipsis overflow-hidden',
                  'max-w-80 whitespace-nowrap',
                )}
              >
                {safePName}
              </div>
            </div>
            <div className="border-b py-1 px-2 flex items-center gap-1">
              <Icon name="arrow-right-short" size={18} color="green" />
              <div className="ml-1 font-medium">
                {t('Continuing')}&nbsp;{Math.round(payload.value)}%
              </div>
            </div>
            {payload.avgTimeFromPrevious && (
              <div className="border-b py-1 px-2 flex items-center gap-1">
                <Icon name="clock-history" size={16} />

                <div className="ml-1 font-medium">
                  {t('Average time from previous step')}{' '}
                  <span>{payload.avgTimeFromPrevious}</span>
                </div>
              </div>
            )}
          </div>
        }
      >
        <div
          className="flex items-center gap-1 copy-popover select-none rounded shadow"
          style={{
            backgroundColor: 'white',
            padding: '3px 6px',
            maxWidth: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '12px',
            width: 'fit-content',
          }}
        >
          {eventIcon}
          <div
            style={{
              maxWidth: '120px',
              width: 'fit-content',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {payload.name}
          </div>
          <span style={{ fontWeight: 'bold' }}>
            {`${Math.round(payload.value)}%`}
          </span>
        </div>
      </Popover>
    </div>
  );
}

export default NodeButton;
