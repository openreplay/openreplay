import React from 'react';
import { numberWithCommas } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';


function LatestSessionsMessage() {
  const { searchStore } = useStore();
  const count = searchStore.latestList.size;
  return count > 0 ? (
    <div
      className="bg-amber-50 p-1 flex w-full border-b text-center justify-center link"
      style={{ backgroundColor: 'rgb(255 251 235)' }}
      onClick={() => searchStore.updateCurrentPage(1)}
    >
      Show {numberWithCommas(count)} New {count > 1 ? 'Sessions' : 'Session'}
    </div>
  ) : (
    <></>
  );
}

export default observer(LatestSessionsMessage);
