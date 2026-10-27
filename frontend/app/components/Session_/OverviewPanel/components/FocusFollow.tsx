import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';

/** Keeps the focus window on the playhead: playing past its end pages it on at
    its own width, a seek outside it centres it. Only a moving head moves it,
    so a window dragged away from a paused head stays put. */
function FocusFollow() {
  const { store } = React.useContext(PlayerContext);
  const { uiPlayerStore } = useStore();
  const { time, playing, endTime } = store.get();

  React.useEffect(() => {
    const { enabled, startTs, endTs } = uiPlayerStore.timelineZoom;
    if (!enabled || (time >= startTs && time <= endTs)) return;
    const width = endTs - startTs;
    const from = playing && time > endTs ? time : time - width / 2;
    const start = Math.min(Math.max(0, from), Math.max(0, endTime - width));
    uiPlayerStore.toggleZoom({ enabled: true, range: [start, start + width] });
  }, [time]);

  return null;
}

export default observer(FocusFollow);
