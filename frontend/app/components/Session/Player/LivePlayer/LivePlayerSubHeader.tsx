import React from 'react';
import { Icon, Tooltip } from 'UI';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import SessionTabs from 'Components/Session/Player/SharedComponents/SessionTabs';

function SubHeader() {
  const { store } = React.useContext(PlayerContext);
  const { location: currentLocation = 'loading...' } = store.get();

  const location =
    currentLocation.length > 70 ? `${currentLocation.slice(0, 70)}...` : currentLocation;

  return (
    <>
      <div className="w-full px-4 pt-2 flex items-center border-b min-h-3">
        <SessionTabs isLive />
      </div>
      {location && (
        <div className={'w-full bg-white border-b border-gray-light'}>
          <div className="flex w-fit items-center cursor-pointer color-gray-medium text-sm p-1">
            <Icon size="20" name="event/link" className="mr-1" />
            <Tooltip title="Open in new tab" delay={0}>
              <a href={location} target="_blank">
                {location}
              </a>
            </Tooltip>
          </div>
        </div>
      )}
    </>
  );
}

export default observer(SubHeader);
