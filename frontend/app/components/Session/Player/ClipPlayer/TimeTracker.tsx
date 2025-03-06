import React from 'react';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { ProgressBar } from 'App/player-ui';

function TimeTracker({ scale, live = false, left }) {
  const { store } = React.useContext(PlayerContext);
  const { time, range } = store.get();

  const adjustedTime = time - range[0];

  return (
    <ProgressBar scale={scale} live={live} left={left} time={adjustedTime} />
  );
}

TimeTracker.displayName = 'TimeTracker';

export default observer(TimeTracker);
