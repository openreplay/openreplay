import { Tooltip } from '@/ui/overlays/tooltip';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'Components/Session/playerContext';

function TabTag({
  logSource,
  logTabId,
}: {
  logSource: number;
  logTabId: string;
}) {
  const { store } = React.useContext(PlayerContext);
  const { tabNames } = store.get();

  return (
    <Tooltip title={tabNames[logTabId] ?? `Tab ${logSource}`} side="left">
      <span className="m-dt__tabtag m-mono">{logSource}</span>
    </Tooltip>
  );
}

export default observer(TabTag);
