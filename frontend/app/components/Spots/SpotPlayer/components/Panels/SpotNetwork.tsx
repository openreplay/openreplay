import { observer } from 'mobx-react-lite';
import React from 'react';

import { NetworkPanelComp } from 'Components/shared/DevTools/NetworkPanel/NetworkPanel';

import spotPlayerStore from '../../spotPlayerStore';

function SpotNetwork({
  panelHeight,
  onClose,
}: {
  panelHeight: number;
  onClose: () => void;
}) {
  const list = spotPlayerStore.network;
  const { index } = spotPlayerStore.getHighlightedEvent(
    spotPlayerStore.time,
    list,
  );
  const listNow = list.slice(0, index);

  return (
    <NetworkPanelComp
      panelHeight={panelHeight}
      fetchList={list}
      fetchListNow={listNow}
      startedAt={spotPlayerStore.startTs}
      zoomEnabled={false}
      resourceList={[]}
      resourceListNow={[]}
      websocketList={[]}
      websocketListNow={[]}
      isSpot
      /* @ts-ignore */
      player={{ jump: (t) => spotPlayerStore.setTime(t) }}
      activeOutsideIndex={index}
      onClose={onClose}
    />
  );
}

export default observer(SpotNetwork);
