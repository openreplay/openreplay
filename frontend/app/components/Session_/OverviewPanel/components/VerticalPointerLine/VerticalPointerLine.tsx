import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';

function VerticalPointerLine() {
  const { store } = React.useContext(PlayerContext);

  const { time, endTime } = store.get();
  return <VerticalPointerLineComp time={time} endTime={endTime} />;
}

export function VerticalPointerLineComp({
  time,
  endTime,
}: {
  time: number;
  endTime: number;
}) {
  const p = endTime ? Math.min(1, Math.max(0, time / endTime)) : 0;
  return (
    <i
      className="m-dt__wf-head m-dt__xray-head"
      style={{ '--p': p } as React.CSSProperties}
      aria-hidden="true"
    />
  );
}

export default observer(VerticalPointerLine);
