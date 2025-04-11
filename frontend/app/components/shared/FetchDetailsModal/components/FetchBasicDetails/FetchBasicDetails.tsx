import React from 'react';
import { formatBytes } from 'App/utils';
import { Tag } from 'antd';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

interface Props {
  resource: any;
  timestamp?: string;
}

function FetchBasicDetails({ resource, timestamp }: Props) {
  const _duration = parseInt(resource.duration);
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-start py-1">
        <div className="font-medium w-36">{t('Name')}</div>
        <Tag
          className="text-base rounded-lg bg-indigo-50 whitespace-normal break-words"
          bordered={false}
          style={{ maxWidth: '300px' }}
        >
          <div>{resource.url}</div>
        </Tag>
      </div>

      {resource.method && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">{t('Request Method')}</div>
          <Tag
            className="text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-ellipsis"
            bordered={false}
          >
            {resource.method}
          </Tag>
        </div>
      )}

      {resource.status && (
        <div className="flex items-center py-1">
          <div className="text-base font-medium w-36">{t('Status Code')}</div>
          <Tag
            bordered={false}
            className={cn(
              'text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-ellipsis flex items-center',
              { 'error color-red': !resource.success },
            )}
          >
            {resource.status}
          </Tag>
        </div>
      )}

      <div className="flex items-center py-1">
        <div className="font-medium w-36">{t('Type')}</div>
        <Tag
          className="text-base capitalize rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-ellipsis"
          bordered={false}
        >
          {resource.type}
        </Tag>
      </div>

      {!!resource.decodedBodySize && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">{t('Size')}</div>
          <Tag
            className="text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-ellipsis"
            bordered={false}
          >
            {formatBytes(resource.decodedBodySize)}
          </Tag>
        </div>
      )}

      {!!_duration && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">{t('Duration')}</div>
          <Tag
            className="text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-ellipsis"
            bordered={false}
          >
            {_duration}&nbsp;{t('ms')}
          </Tag>
        </div>
      )}

      {timestamp && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">{t('Time')}</div>
          <Tag
            className="text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-ellipsis"
            bordered={false}
          >
            {timestamp}
          </Tag>
        </div>
      )}
    </div>
  );
}

export default FetchBasicDetails;
