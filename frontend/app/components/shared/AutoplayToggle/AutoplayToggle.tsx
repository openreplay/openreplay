import React from 'react';
import { Toggler } from 'UI';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

function AutoplayToggle() {
  const { player, store } = React.useContext(PlayerContext)
  const { autoplay } = store.get()

  return (
    <div
      onClick={() => player.toggleAutoplay()}
      className="cursor-pointer flex items-center mr-2 hover:bg-gray-light-shade rounded-md p-2"
    >
      <Toggler name="sessionsLive" onChange={() => player.toggleAutoplay()} checked={autoplay} />
      <span className="ml-2 whitespace-nowrap">Auto-Play</span>
    </div>
  );
}

export default observer(AutoplayToggle);
