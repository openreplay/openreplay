import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import {
  BACKENDLOGS,
  CONSOLE,
  EXCEPTIONS,
  GRAPHQL,
  INSPECTOR,
  LONG_TASK,
  NETWORK,
  NONE,
  OVERVIEW,
  PERFORMANCE,
  PROFILER,
  STACKEVENTS,
  STORAGE,
} from 'App/mstore/uiPlayerStore';
import EscapeButton from 'App/player-ui/EscapeButton';
import { debounce } from 'App/utils';
import { Exceptions } from 'Components/Session_/Exceptions/Exceptions';
import GraphQL from 'Components/Session_/GraphQL';
import Controls from 'Components/Session_/Player/Controls';
import Overlay from 'Components/Session_/Player/Overlay';
import stl from 'Components/Session_/Player/player.module.css';
import Storage from 'Components/Session_/Storage';

import ConsolePanel from 'Shared/DevTools/ConsolePanel';
import { WebNetworkPanel } from 'Shared/DevTools/NetworkPanel';
import ProfilerPanel from 'Shared/DevTools/ProfilerPanel';
import { WebStackEventPanel } from 'Shared/DevTools/StackEventPanel/StackEventPanel';

import LongTaskPanel from '../../../shared/DevTools/LongTaskPanel/LongTaskPanel';
import DevTools from '../../ReplayScreen/DevTools';
import BackendLogsPanel from '../SharedComponents/BackendLogs/BackendLogsPanel';
import {
  ConnectedPerformance,
  OverviewPanel,
  usePrefetchChartPanels,
} from '../chartPanels';

interface IProps {
  fullView: boolean;
  isMultiview?: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const heightKey = 'playerPanelHeight';
export const debounceUpdate = debounce((height: number) => {
  localStorage.setItem(heightKey, height.toString());
}, 500);
export const getDefaultPanelHeight = () => {
  const storageHeight = localStorage.getItem(heightKey);
  if (storageHeight) {
    const height = parseInt(storageHeight, 10);
    return height > window.innerHeight / 2 ? window.innerHeight / 2 : height;
  }
  return 300;
};

function Player(props: IProps) {
  usePrefetchChartPanels();
  const { uiPlayerStore, sessionStore, userStore } = useStore();
  const { nextId } = sessionStore;
  const { sessionId } = sessionStore.current;
  const { updateLastPlayedSession } = sessionStore;
  const { fullscreenOff } = uiPlayerStore;
  const { bottomBlock } = uiPlayerStore;
  const { fullscreen } = uiPlayerStore;
  const defaultHeight = getDefaultPanelHeight();
  const [panelHeight, setPanelHeight] = React.useState(defaultHeight);
  const { activeTab, fullView } = props;
  const playerContext = React.useContext(PlayerContext);
  const isReady = playerContext.store.get().ready;
  const screenWrapper = React.useRef<HTMLDivElement>(null);
  const bottomBlockIsActive = !fullscreen && bottomBlock !== NONE;
  const isAttached = React.useRef(false);

  React.useEffect(() => {
    updateLastPlayedSession(sessionId);
    if (isReady && !isAttached.current) {
      const parentElement = screenWrapper.current; // TODO: good architecture
      if (parentElement) {
        playerContext.player.attach(parentElement);
        isAttached.current = true;
      }
    }
  }, [isReady]);

  React.useEffect(() => {
    playerContext.player.scale();
  }, [bottomBlock, fullscreen, playerContext.player, activeTab, fullView]);

  if (!playerContext.player) return null;

  const isInspMode = playerContext.store.get().inspectorMode;
  const { messagesLoading, markedTargets } = playerContext.store.get();
  const permissions = userStore.account.permissions || [];
  const devtoolsDisabled =
    (userStore.isEnterprise &&
      !(
        permissions.includes('DEV_TOOLS') ||
        permissions.includes('SERVICE_DEV_TOOLS')
      )) ||
    messagesLoading ||
    isInspMode ||
    !!markedTargets;

  return (
    <div
      className={cn(
        stl.playerBody,
        'flex-1 flex flex-col relative',
        fullscreen && 'pb-2',
      )}
      data-bottom-block={bottomBlockIsActive}
      data-testid="player-inst"
    >
      {fullscreen && <EscapeButton onClose={fullscreenOff} />}
      <div
        className={cn('relative flex-1', 'overflow-hidden')}
        id="player-container"
        data-replay-stage
      >
        <Overlay nextId={nextId} />
        <div
          id="replay-screen-wrapper"
          className={cn(
            stl.screenWrapper,
            isInspMode ? stl.solidBg : stl.checkers,
          )}
          ref={screenWrapper}
          data-openreplay-obscured
        />
      </div>
      {!fullscreen && !fullView ? (
        <DevTools
          disabled={devtoolsDisabled}
          height={panelHeight}
          onHeight={(h) => {
            setPanelHeight(h);
            debounceUpdate(h);
          }}
        >
          <BottomBlock block={bottomBlock} panelHeight={panelHeight} />
        </DevTools>
      ) : null}
      <Controls
        fullView={fullView}
        setActiveTab={(tab: string) =>
          activeTab === tab ? props.setActiveTab('') : props.setActiveTab(tab)
        }
        activeTab={activeTab}
        speedDown={playerContext.player.speedDown}
        speedUp={playerContext.player.speedUp}
        jump={playerContext.player.jump}
      />
    </div>
  );
}

function BottomBlock({
  panelHeight,
  block,
}: {
  panelHeight: number;
  block: number;
}) {
  switch (block) {
    case CONSOLE:
      return <ConsolePanel />;
    case NETWORK:
      return <WebNetworkPanel panelHeight={panelHeight} />;
    case STACKEVENTS:
      return <WebStackEventPanel />;
    case STORAGE:
      return <Storage />;
    case PROFILER:
      return <ProfilerPanel panelHeight={panelHeight} />;
    case PERFORMANCE:
      // lazy: only this panel waits for its chunk, the strip stays
      return (
        <React.Suspense fallback={null}>
          <ConnectedPerformance />
        </React.Suspense>
      );
    case GRAPHQL:
      return <GraphQL panelHeight={panelHeight} />;
    case EXCEPTIONS:
      return <Exceptions />;
    case BACKENDLOGS:
      return <BackendLogsPanel />;
    case LONG_TASK:
      return <LongTaskPanel />;
    case OVERVIEW:
      return (
        <React.Suspense fallback={null}>
          <OverviewPanel />
        </React.Suspense>
      );
    default:
      return null;
  }
}

export default observer(Player);
