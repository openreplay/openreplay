import React, { useMemo } from 'react';
import { formatBytes } from 'App/utils';
import CopyText from 'Shared/CopyText';
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
        <div className="font-medium">Name</div>
        <div className="rounded-lg bg-active-blue px-2 py-1 ml-2 cursor-pointer word-break">
          <CopyText content={resource.url}>{resource.url}</CopyText>
        </div>
      </div>

      <div className="flex items-center py-1">
        <div className="font-medium">Type</div>
        <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
          {resource.type}
        </div>
      </div>

      {!!resource.decodedBodySize && (
        <div className="flex items-center py-1">
          <div className="font-medium">Size</div>
          <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
            {formatBytes(resource.decodedBodySize)}
          </div>
        </div>
      )}

      {resource.method && (
        <div className="flex items-center py-1">
          <div className="font-medium">Request Method</div>
          <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
            {resource.method}
          </div>
        </div>
      )}

      {resource.status && (
        <div className="flex items-center py-1">
          <div className="font-medium">Status</div>
          <div
            className={cn(
              'rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip flex items-center',
              { 'error color-red': !resource.success }
            )}
          >
            {resource.status === '200' && (
              <div className="w-4 h-4 bg-green rounded-full mr-2"></div>
            )}
            {resource.status}
          </div>
        </div>
      )}

      {!!_duration && (
        <div className="flex items-center py-1">
          <div className="font-medium">Duration</div>
          <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
            {_duration} ms
          </div>
        </div>
      )}

      {timestamp && (
        <div className="flex items-center py-1">
        <div className="font-medium">Time</div>
        <div className="rounded bg-active-blue px-2 py-1 ml-2 whitespace-nowrap overflow-hidden text-clip">
          {timestamp}
        </div>
      </div>

      )}
    </div>
  );
}

export default FetchBasicDetails;
