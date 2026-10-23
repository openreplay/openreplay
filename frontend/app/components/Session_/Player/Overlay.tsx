import { ContextMenu } from '@/ui/actions/context-menu';
import type { MenuItem } from '@/ui/actions/dropdown-menu';
import { Icon } from '@/ui/icons/Icon';
import { toast } from '@/ui/overlays/toast';
import copy from 'copy-to-clipboard';
import { Link2, ScanLine } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import {
  CONSOLE,
  NETWORK,
  OVERVIEW,
  PERFORMANCE,
  STACKEVENTS,
  STORAGE,
} from 'App/mstore/uiPlayerStore';

import { useModal } from '../../Modal';
import AutoplayTimer from './Overlay/AutoplayTimer';
import Loader from './Overlay/Loader';
import PlayIconLayer from './Overlay/PlayIconLayer';

interface Props {
  nextId?: string;
  closedLive?: boolean;
  isClickmap?: boolean;
}

// the dev tools strip's order
enum ItemKey {
  XRay = '1',
  Console = '2',
  Network = '3',
  Performance = '4',
  Events = '5',
  State = '6',
  AddNote = '7',
  CopySessionUrl = '8',
  CopySessionUrlTs = '9',
}

const menuItems: MenuItem[] = [
  {
    key: ItemKey.XRay,
    label: 'X-Ray',
    icon: <ScanLine size={14} strokeWidth={1.5} />,
  },
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
  { key: 'divider', type: 'divider' },
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
    tabStates,
  } = store.get();
  const cssLoading = Object.values(tabStates).some(
    ({ cssLoading }) => cssLoading,
  );
  const { resolvingInputs, switchingSession } = uiPlayerStore;
  // between sessions the previous one stays on the stage, paused, under the loader
  const loading = messagesLoading || cssLoading || switchingSession;

  const showAutoplayTimer =
    completed && autoplay && nextId && !switchingSession;
  const showPlayIconLayer =
    !isClickmap && !inspectorMode && !loading && !showAutoplayTimer;

  const onClick = ({ key }: { key: string }) => {
    switch (key) {
      case ItemKey.XRay:
        toggleBottomBlock(OVERVIEW);
        break;
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
      {loading || resolvingInputs ? (
        <div
          className="absolute z-50 top-0 left-0 bottom-0 right-0"
          style={{ background: 'rgba(0,0,0, 0.4)' }}
        >
          <Loader />
        </div>
      ) : null}
      <ContextMenu
        items={menuItems.map((it) => ({
          ...it,
          onClick: () => onClick({ key: it.key }),
        }))}
      >
        <div>
          {showPlayIconLayer && (
            <PlayIconLayer
              jumpInterval={player.jumpInterval}
              playing={playing}
              togglePlay={togglePlay}
            />
          )}
        </div>
      </ContextMenu>
    </>
  );
}

export default observer(Overlay);
