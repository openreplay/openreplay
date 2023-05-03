import React from 'react';
import { Input, Button } from 'UI';
import { PlayerContext } from 'App/components/Session/playerContext';

function EventSearch(props) {
  const { player } = React.useContext(PlayerContext);

  const { onChange, value, header, setActiveTab } = props;

  const toggleEvents = () => player.toggleEvents();

  return (
    <div className="flex items-center w-full relative">
      <div className="flex flex-1 flex-col">
        <div className="flex items-center">
          <Input
            autoFocus
            type="text"
            placeholder="Filter"
            className="inset-0 w-full"
            name="query"
            value={value}
            onChange={onChange}
            wrapperClassName="w-full"
            style={{ height: '32px' }}
            autoComplete="off chromebugfix"
          />

          <Button
            className="ml-2"
            icon="close"
            variant="text"
            onClick={() => {
              setActiveTab('');
              toggleEvents();
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default EventSearch;
