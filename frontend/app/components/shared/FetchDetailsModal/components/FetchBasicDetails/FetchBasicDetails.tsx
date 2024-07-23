import React, { useMemo } from 'react';
import { formatBytes } from 'App/utils';
import CopyText from 'Shared/CopyText';
import { Tag } from 'antd';
import cn from 'classnames';

interface Props {
  resource: any;
  timestamp?: string;
}

function FetchBasicDetails({ resource, timestamp }: Props) {
  const _duration = parseInt(resource.duration);
  const text = useMemo(() => {
    if (resource.url.length > 50) {
      const endText = resource.url.split('/').pop();
      return resource.url.substring(0, 50 - endText.length) + '.../' + endText;
    }
    return resource.url;
  }, [resource]);

  return (
    <div>
      <div className="flex items-start py-1">
        <div className="font-medium w-36">Name</div>
        <Tag
          className="text-base max-w-96 rounded-lg text-clip bg-indigo-50 whitespace-nowrap overflow-hidden text-clip cursor-pointer word-break"
          bordered={false}>
          <CopyText content={resource.url}>{resource.url}</CopyText>
        </Tag>
      </div>

      <div className="flex items-center py-1">
        <div className="font-medium w-36">Type</div>
        <Tag className="text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-clip" bordered={false}>
          {resource.type}
        </Tag>
      </div>

      {resource.method && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">Request Method</div>
          <Tag className="text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-clip"
               bordered={false}>
            {resource.method}
          </Tag>
        </div>
      )}

      {resource.status && (
        <div className="flex items-center py-1">
          <div className="text-base font-medium w-36">Status Code</div>
          <Tag
            bordered={false}
            className={cn(
              'text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-clip flex items-center',
              { 'error color-red': !resource.success }
            )}
          >
            {resource.status}
          </Tag>
        </div>
      )}

      <div className="flex items-center py-1">
        <div className="font-medium w-36">Type</div>
        <Tag className="text-base capitalize rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-clip"
             bordered={false}>
          {resource.type}
        </Tag>
      </div>

      {!!resource.decodedBodySize && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">Size</div>
          <Tag className="text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-clip"
               bordered={false}>
            {formatBytes(resource.decodedBodySize)}
          </Tag>
        </div>
      )}


      {!!_duration && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">Duration</div>
          <Tag className="text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-clip"
               bordered={false}>
            {_duration} ms
          </Tag>
        </div>
      )}

      {timestamp && (
        <div className="flex items-center py-1">
          <div className="font-medium w-36">Time</div>
          <Tag className="text-base rounded-lg bg-indigo-50 whitespace-nowrap overflow-hidden text-clip"
               bordered={false}>
            {timestamp}
          </Tag>
        </div>

      )}
    </div>
  );
}

export default FetchBasicDetails;
