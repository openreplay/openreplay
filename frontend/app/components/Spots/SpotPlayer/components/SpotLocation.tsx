import { observer } from 'mobx-react-lite';
import React from 'react';
import { Tooltip } from 'antd'
import { Icon } from 'UI';
import spotPlayerStore from '../spotPlayerStore';

function SpotLocation() {
  const currUrl = spotPlayerStore.getClosestLocation(
    spotPlayerStore.time
  )?.location;
  return (
    <div className={'w-full bg-white border-b border-gray-lighter'}>
      <div className="flex w-fit items-center cursor-pointer color-gray-medium text-sm p-1">
        <Icon size="20" name="event/link" className="mr-1" />
        <Tooltip title="Open in new tab">
          <a href={currUrl} target="_blank" className="truncate">
            {currUrl}
          </a>
        </Tooltip>
      </div>
    </div>
  );
}

export default observer(SpotLocation);
