import {
  CONSOLE,
  NETWORK,
  PERFORMANCE,
  STACKEVENTS,
  STORAGE,
} from 'App/mstore/uiPlayerStore';
import React from 'react';
import AutoplayTimer from 'Components/Session_/Player/Overlay/AutoplayTimer';
import PlayIconLayer from 'Components/Session_/Player/Overlay/PlayIconLayer';
import Loader from 'Components/Session_/Player/Overlay/Loader';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Icon } from 'UI';
import { useStore } from 'App/mstore';

interface Props {
  nextId?: string;
  closedLive?: boolean;
  isClickmap?: boolean;
}

enum ItemKey {
  Console = '1',
  Network = '2',
  Performance = '3',
  Events = '4',
  State = '5',
  AddNote = '6',
}

const menuItems: MenuProps['items'] = [
  {
    key: ItemKey.Console,
    label: 'Console',
    icon: <Icon name="terminal" size={14} />,
  },
  {
    key: ItemKey.Network,
    label: 'Network',
    icon: <Icon name="arrow-down-up" size={14} />,
  },
  {
    key: ItemKey.Performance,
    label: 'Performance',
    icon: <Icon name="speedometer2" size={14} />,
  },
  {
    key: ItemKey.Events,
    label: 'Events',
    icon: <Icon name="filetype-js" size={14} />,
  },
  { type: 'divider' },
  {
    key: ItemKey.AddNote,
    label: 'Add Note',
    icon: <Icon name="quotes" size={14} />,
  },
];

function Overlay({ nextId, isClickmap }: Props) {
  const { player, store } = React.useContext(PlayerContext);
  const { uiPlayerStore } = useStore();
  const { toggleBottomBlock } = uiPlayerStore;
  const togglePlay = () => player.togglePlay();
  const { playing, messagesLoading, completed, autoplay } = store.get();
  const loading = messagesLoading;

  const showAutoplayTimer = completed && autoplay && nextId;
  const showPlayIconLayer = !isClickmap && !loading && !showAutoplayTimer;

  const onClick = ({ key }: { key: string }) => {
    switch (key) {
      case ItemKey.Console:
        toggleBottomBlock(CONSOLE);
        break;
      case ItemKey.Network:
        toggleBottomBlock(NETWORK);
        break;
      case ItemKey.Performance:
        toggleBottomBlock(PERFORMANCE);
        break;
      case ItemKey.Events:
        toggleBottomBlock(STACKEVENTS);
        break;
      case ItemKey.State:
        toggleBottomBlock(STORAGE);
        break;
      case ItemKey.AddNote:
        // TODO setCreateNoteTooltip({ time: store.get().time, isVisible: true });
        break;
      default:
    }
  };
  return (
    <>
      {showAutoplayTimer && <AutoplayTimer />}
      {loading ? <Loader /> : null}
      <Dropdown menu={{ items: menuItems, onClick }} trigger={['contextMenu']}>
        <div>
          {showPlayIconLayer && (
            <PlayIconLayer playing={playing} togglePlay={togglePlay} />
          )}
        </div>
      </Dropdown>
    </>
  );
}

export default observer(Overlay);
