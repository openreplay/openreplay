import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { Link2 } from 'lucide-react';
import copy from 'copy-to-clipboard';
import { toast } from 'react-toastify';

import { PlayerContext } from 'App/components/Session/playerContext';
import {
  CONSOLE,
  NETWORK,
  PERFORMANCE,
  STACKEVENTS,
  STORAGE,
} from 'App/mstore/uiPlayerStore';
import { Icon } from 'UI';

import { useStore } from 'App/mstore';
import { useModal } from '../../Modal';
import AutoplayTimer from './Overlay/AutoplayTimer';
import ElementsMarker from './Overlay/ElementsMarker';
import Loader from './Overlay/Loader';
import PlayIconLayer from './Overlay/PlayIconLayer';

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
  CopySessionUrl = '7',
  CopySessionUrlTs = '8',
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
  {
    key: ItemKey.State,
    label: 'State',
    icon: <Icon name="redux" size={14} />,
  },
  { type: 'divider' },
  // {
  //   key: ItemKey.AddNote,
  //   label: 'Add Note',
  //   icon: <Icon name={'quotes'} size={14} />,
  // },
  {
    key: ItemKey.CopySessionUrl,
    label: 'Copy Session URL',
    icon: <Link2 size={14} strokeWidth={1} />,
  },
  {
    key: ItemKey.CopySessionUrlTs,
    label: 'Copy Session URL At Current Time',
    icon: <Link2 size={14} strokeWidth={1} />,
  },
];

function Overlay({ nextId, isClickmap }: Props) {
  const { player, store } = React.useContext(PlayerContext);
  const { uiPlayerStore } = useStore();
  const { toggleBottomBlock } = uiPlayerStore;
  const togglePlay = () => player.togglePlay();
  const {
    playing,
    messagesLoading,
    completed,
    autoplay,
    inspectorMode,
    markedTargets,
    activeTargetIndex,
    tabStates,
  } = store.get();
  const { showModal, hideModal } = useModal();
  const cssLoading = Object.values(tabStates).some(
    ({ cssLoading }) => cssLoading,
  );
  const loading = messagesLoading || cssLoading;

  const showAutoplayTimer = completed && autoplay && nextId;
  const showPlayIconLayer =
    !isClickmap &&
    !markedTargets &&
    !inspectorMode &&
    !loading &&
    !showAutoplayTimer;

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
      // case ItemKey.AddNote:
      //   showModal(
      //     <CreateNote
      //       hideModal={hideModal}
      //       isEdit={false}
      //       time={Math.round(store.get().time)}
      //     />,
      //     { right: true, width: 380 }
      //   );
      //   break;
      case ItemKey.CopySessionUrl:
        copy(window.location.origin + window.location.pathname);
        toast.success('Session URL copied to clipboard');
        break;
      case ItemKey.CopySessionUrlTs:
        copy(
          `${window.location.origin + window.location.pathname}?jumpto=${String(
            Math.round(store.get().time),
          )}`,
        );
        toast.success('Session URL at current time copied to clipboard');
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
      {markedTargets && (
        <ElementsMarker
          targets={markedTargets}
          activeIndex={activeTargetIndex}
        />
      )}
    </>
  );
}

export default observer(Overlay);
