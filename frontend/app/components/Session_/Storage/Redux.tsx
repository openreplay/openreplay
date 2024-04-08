import { selectStorageList, selectStorageListNow } from 'Player';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { JSONTree } from 'UI';

import logger from '../../../logger';
import BottomBlock from '../BottomBlock/index';

interface ListItem {
  action: { type: string; payload?: any };
  actionTime: number;
  duration: number;
  state: Record<string, any>;
  tabId: string;
  time: number;
}

function ReduxViewer() {
  const { player, store } = React.useContext(PlayerContext);
  const { tabStates, currentTab } = store.get();

  const state = tabStates[currentTab] || {};
  const listNow = selectStorageListNow(state) || [];
  const list = selectStorageList(state) || [];

  const decodeMessage = (msg: any) => {
    const decoded = {};
    const pureMSG = { ...msg };
    const keys = ['state', 'action'];
    try {
      keys.forEach((key) => {
        if (pureMSG[key]) {
          // @ts-ignore TODO: types for decoder
          decoded[key] = player.decodeMessage(pureMSG[key]);
        }
      });
    } catch (e) {
      logger.error('Error on message decoding: ', e, pureMSG);
      return null;
    }
    return { ...pureMSG, ...decoded };
  };

  const decodedList = React.useMemo(() => {
    return listNow.map((msg) => {
      return decodeMessage(msg) as ListItem;
    });
  }, [listNow.length]);

  return (
    <BottomBlock>
      <BottomBlock.Header>REDUX</BottomBlock.Header>
      {decodedList.map((msg, i) => (
        <div>
          <div className={'font-semibold'}>{msg.action.type ?? 'action'}</div>
          {decodedList[i - 1] ? (
            <div className={'flex items-start gap-2'}>
              <div>prev state</div>
              <JSONTree src={decodedList[i - 1].state} collapsed />
            </div>
          ) : null}
          <div className={'flex items-start gap-2'}>
            <div>action</div>
            <JSONTree src={msg.action} collapsed />
          </div>
          <div className={'flex items-start gap-2'}>
            <div>next state</div>
            <JSONTree src={msg.state} collapsed />
          </div>
        </div>
      ))}
    </BottomBlock>
  );
}

export default observer(ReduxViewer);
