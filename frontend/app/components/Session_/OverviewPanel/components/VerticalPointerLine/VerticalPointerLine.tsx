import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';

function VerticalPointerLine({
  view,
}: {
  view?: { start: number; end: number } | null;
}) {
  const { store } = React.useContext(PlayerContext);

  const { time, endTime } = store.get();
  if (view && (time < view.start || time > view.end)) return null;
  return (
    <VerticalPointerLineComp
      time={time}
      startTime={view?.start}
      endTime={view?.end ?? endTime}
    />
  );
}

export function VerticalPointerLineComp({
  time,
  startTime = 0,
  endTime,
}: {
  time: number;
  startTime?: number;
  endTime: number;
}) {
  const span = endTime - startTime;
  const p = span > 0 ? Math.min(1, Math.max(0, (time - startTime) / span)) : 0;
  return (
    <i
      className="m-dt__wf-head m-dt__xray-head"
      style={{ '--p': p } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}

export default observer(VerticalPointerLine);
