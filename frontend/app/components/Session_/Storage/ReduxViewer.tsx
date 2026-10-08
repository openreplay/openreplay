import { JSONTree } from '@/ui/data/JSONTree';
import { selectStorageListNow } from 'Player';
import { ChevronRight, GitCommitVertical } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { durationFromMs } from 'App/date';

import JumpButton from '../../shared/DevTools/JumpButton';
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
  const { t } = useTranslation();
  const { player, store } = React.useContext(PlayerContext);
  const { tabStates, currentTab, sessionStart } = store.get();

  const state = tabStates[currentTab] || {};
  const listNow = selectStorageListNow(state) || [];

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
      console.error('Error on state message decoding: ', e, pureMSG);
      return null;
    }
    return { ...pureMSG, ...decoded };
  };

  const decodedList = React.useMemo(
    () => listNow.map((msg) => decodeMessage(msg) as ListItem),
    [listNow.length],
  );

  return (
    <BottomBlock>
      <>
        <BottomBlock.Header>
          <span className="m-dt__title">{t('Redux')}</span>
        </BottomBlock.Header>
        <BottomBlock.Content className="overflow-y-auto">
          {decodedList.map((msg, i) => (
            <StateEvent
              msg={msg}
              key={i}
              sessionStart={sessionStart}
              prevMsg={decodedList[i - 1]}
              onJump={player.jump}
            />
          ))}
        </BottomBlock.Content>
      </>
    </BottomBlock>
  );
}

function StateEvent({
  msg,
  sessionStart,
  prevMsg,
  onJump,
}: {
  msg: ListItem;
  sessionStart: number;
  onJump: (time: number) => void;
  prevMsg?: ListItem;
}) {
  const { t } = useTranslation();
  const [isOpen, setOpen] = React.useState(false);
  return (
    <div className="m-mono group relative flex w-full flex-col border-b border-border-subtle px-4 py-1 text-content-secondary hover:bg-surface-hover">
      <div
        className="w-full gap-2 flex items-center cursor-pointer h-full"
        onClick={() => setOpen(!isOpen)}
      >
        <ChevronRight
          size={12}
          className={isOpen ? 'rotate-90 transition' : 'transition'}
        />
        <GitCommitVertical strokeWidth={1} />
        <div className="font-medium text-content-primary">
          {msg.action.type ?? 'action'}
        </div>
        <div className="text-content-muted">
          @ {durationFromMs(msg.actionTime - sessionStart)}&nbsp;({t('in')}
          &nbsp;
          {durationFromMs(msg.duration)})
        </div>
      </div>
      {isOpen ? (
        <div
          className="py-4 flex flex-col gap-2"
          style={{ paddingLeft: '3.7rem' }}
        >
          {prevMsg ? (
            <div className="flex items-start gap-2">
              <div className="text-content-secondary">{t('prev state')}</div>
              <JSONTree src={prevMsg.state} collapsed />
            </div>
          ) : null}
          <div className="flex items-start gap-2">
            <div className="text-content-warning">{t('action')}</div>
            <JSONTree src={msg.action} collapsed />
          </div>
          <div className="flex items-start gap-2">
            <div className="text-content-accent">{t('next state')}</div>
            <JSONTree src={msg.state} collapsed />
          </div>
        </div>
      ) : null}

      <JumpButton onClick={() => onJump(msg.time)} />
    </div>
  );
}

export default observer(ReduxViewer);
