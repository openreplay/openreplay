import React from 'react';
import { Tooltip } from 'antd';
import { observer } from 'mobx-react-lite';
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
    <Tooltip
      title={`${tabNames[logTabId] ?? `Tab ${logSource}`}`}
      placement="left"
    >
      <div className="bg-gray-light rounded-full min-w-5 min-h-5 w-5 h-5 flex items-center justify-center text-xs cursor-default">
        {logSource}
      </div>
    </Tooltip>
  );
}

export default observer(TabTag);
