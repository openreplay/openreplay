import React from 'react';
import { Icon, Tooltip } from 'UI';
import copy from 'copy-to-clipboard';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

function SubHeader() {
  const { store } = React.useContext(PlayerContext)
  const {
    location: currentLocation,
  } = store.get()
  const [isCopied, setCopied] = React.useState(false);

  const location =
    currentLocation !== undefined ? currentLocation.length > 60
      ? `${currentLocation.slice(0, 60)}...`
      : currentLocation : undefined;

  return (
    <div className="w-full px-4 py-2 flex items-center border-b min-h-3">
      {location && (
        <div
          className="flex items-center cursor-pointer color-gray-medium text-sm p-1 hover:bg-gray-light-shade rounded-md"
          onClick={() => {
            copy(currentLocation || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 5000);
          }}
        >
          <Icon size="20" name="event/link" className="mr-1" />
          <Tooltip title={isCopied ? 'URL Copied to clipboard' : 'Click to copy'}>
            {location}
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export default observer(SubHeader);
