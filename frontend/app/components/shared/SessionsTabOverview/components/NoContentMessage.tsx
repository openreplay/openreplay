import React from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function NoContentMessage() {
  const { searchStore } = useStore();
  const { activeTab } = searchStore;
  return <div>{getNoContentMessage(activeTab)}</div>;
}

export default observer(NoContentMessage);

function getNoContentMessage(activeTab: any) {
  let str = 'No recordings found';
  if (activeTab.type !== 'all') {
    str += ` with ${activeTab.name}`;
    return str;
  }

  return `${str}!`;
}
