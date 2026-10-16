import { observer } from 'mobx-react-lite';
import React from 'react';

import { ProgressBar } from 'App/player-ui';

function TimeTracker({ scale, live = false, left }) {
  return <ProgressBar scale={scale} live={live} left={left} />;
}

TimeTracker.displayName = 'TimeTracker';

export default observer(TimeTracker);
