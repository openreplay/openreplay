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

  const maxUrlLength = 800;
  const displayUrl =
    resource.url && resource.url.length > maxUrlLength
      ? `${resource.url.slice(0, maxUrlLength / 2)}......${resource.url.slice(-maxUrlLength / 2)}`
      : resource.url;
  return (
    <div>
      <div className="flex items-start py-1">
        <div className="font-medium w-36">{t('Name')}</div>
        <Tag
          className="text-base rounded-lg bg-indigo-lightest whitespace-normal wrap-break-word"
          variant="filled"
          style={{ maxWidth: '300px' }}
        >
          <div>{displayUrl}</div>
        </Tag>
      </div>

      {resource.method && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">{t('Request Method')}</div>
          <Tag
            className="text-base rounded-lg bg-indigo-lightest whitespace-nowrap overflow-hidden text-ellipsis"
            variant="filled"
          >
            {resource.method}
          </Tag>
        </div>
      )}

      {resource.status && (
        <div className="flex items-center py-1">
          <div className="text-base font-medium w-36">{t('Status Code')}</div>
          <Tag
            variant="filled"
            className={cn(
              'text-base rounded-lg bg-indigo-lightest whitespace-nowrap overflow-hidden text-ellipsis flex items-center',
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
          className="text-base capitalize rounded-lg bg-indigo-lightest whitespace-nowrap overflow-hidden text-ellipsis"
          variant="filled"
        >
          {resource.type}
        </Tag>
      </div>

      {!!resource.decodedBodySize && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">{t('Size')}</div>
          <Tag
            className="text-base rounded-lg bg-indigo-lightest whitespace-nowrap overflow-hidden text-ellipsis"
            variant="filled"
          >
            {formatBytes(resource.decodedBodySize)}
          </Tag>
        </div>
      )}

      {!!_duration && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">{t('Duration')}</div>
          <Tag
            className="text-base rounded-lg bg-indigo-lightest whitespace-nowrap overflow-hidden text-ellipsis"
            variant="filled"
          >
            {_duration}&nbsp;{t('ms')}
          </Tag>
        </div>
      )}

      {timestamp && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">{t('Time')}</div>
          <Tag
            className="text-base rounded-lg bg-indigo-lightest whitespace-nowrap overflow-hidden text-ellipsis"
            variant="filled"
          >
            {timestamp}
          </Tag>
        </div>
      )}
    </div>
  );
}

export default FetchBasicDetails;
