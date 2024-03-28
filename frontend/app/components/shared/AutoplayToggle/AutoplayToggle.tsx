import React from 'react';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { Switch } from 'antd'

function AutoplayToggle() {
  const { player, store } = React.useContext(PlayerContext)
  const { autoplay } = store.get()

  return (
      <Switch onChange={() => player.toggleAutoplay()} checked={autoplay} unCheckedChildren="Auto" checkedChildren="Auto" />
  );
}

export default observer(AutoplayToggle);
