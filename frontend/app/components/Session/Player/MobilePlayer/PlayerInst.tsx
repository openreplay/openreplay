import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import {
  CONSOLE,
  EXCEPTIONS,
  GRAPHQL,
  NETWORK,
  OVERVIEW,
  PERFORMANCE,
  STACKEVENTS,
} from 'App/mstore/uiPlayerStore';
import EscapeButton from 'App/player-ui/EscapeButton';
import PerfWarnings from 'Components/Session/Player/MobilePlayer/PerfWarnings';
import ReplayWindow from 'Components/Session/Player/MobilePlayer/ReplayWindow';
import {
  debounceUpdate,
  getDefaultPanelHeight,
} from 'Components/Session/Player/ReplayPlayer/PlayerInst';
import { MobileExceptions } from 'Components/Session_/Exceptions/Exceptions';
import GraphQL from 'Components/Session_/GraphQL';
import Controls from 'Components/Session_/Player/Controls';
import stl from 'Components/Session_/Player/player.module.css';

import MobileConsolePanel from 'Shared/DevTools/ConsolePanel/MobileConsolePanel';
import { MobileNetworkPanel } from 'Shared/DevTools/NetworkPanel';
import { MobileStackEventPanel } from 'Shared/DevTools/StackEventPanel';

import {
  MobileOverviewPanel,
  MobilePerformance,
  usePrefetchChartPanels,
} from '../chartPanels';
import MobileDevTools from './MobileDevTools';
import Overlay from './MobileOverlay';

interface IProps {
  fullView: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

function Player({ activeTab, fullView, setActiveTab }: IProps) {
  usePrefetchChartPanels();
  const [panelHeight, setPanelHeight] = React.useState(getDefaultPanelHeight);
  const { uiPlayerStore, sessionStore, userStore } = useStore();
  const { nextId, updateLastPlayedSession } = sessionStore;
  const {
    sessionId,
    userDevice,
    videoURL,
    platform,
    screenWidth,
    screenHeight,
  } = sessionStore.current;
  const { fullscreen, fullscreenOff, bottomBlock } = uiPlayerStore;
  const playerContext = React.useContext(MobilePlayerContext);
  const { ready, messagesLoading } = playerContext.store.get();
  const screenWrapper = React.useRef<HTMLDivElement>(null);
  const isAttached = React.useRef(false);

  React.useEffect(() => {
    updateLastPlayedSession(sessionId);
    const parent = screenWrapper.current;
    if (parent && !isAttached.current) {
      playerContext.player.attach(parent);
      isAttached.current = true;
    }
  }, [ready]);

  React.useEffect(() => {
    playerContext.player.addFullscreenBoundary(fullscreen || fullView);
  }, [fullscreen, fullView]);

  // The phone is scaled to its box; the box moves with the side panel,
  // the devtools height and full screen, none of which resize the window.
  React.useEffect(() => {
    const el = screenWrapper.current;
    if (!el) return undefined;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => playerContext.player.scale());
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [playerContext.player]);

  if (!playerContext.player) return null;

  const permissions = userStore.account.permissions || [];
  const devtoolsDisabled =
    (userStore.isEnterprise &&
      !(
        permissions.includes('DEV_TOOLS') ||
        permissions.includes('SERVICE_DEV_TOOLS')
      )) ||
    messagesLoading;

  return (
    <div
      className={cn(
        stl.playerBody,
        'flex-1 flex flex-col relative',
        fullscreen && 'pb-2',
      )}
      data-bottom-block={!fullscreen && !!bottomBlock}
    >
      {fullscreen && <EscapeButton onClose={fullscreenOff} />}
      <div
        className="relative flex-1 min-h-0 overflow-hidden p-4 bg-[var(--m-surface-canvas)]"
        data-replay-stage
      >
        <Overlay nextId={nextId} />
        <div className={stl.mobileScreenWrapper} ref={screenWrapper}>
          <ReplayWindow
            videoURL={videoURL}
            userDevice={userDevice}
            isAndroid={platform === 'android'}
            screenWidth={screenWidth!}
            screenHeight={screenHeight!}
          />
          <PerfWarnings userDevice={userDevice} />
        </div>
      </div>
      {!fullscreen && !fullView ? (
        <MobileDevTools
          disabled={devtoolsDisabled}
          height={panelHeight}
          onHeight={(h) => {
            setPanelHeight(h);
            debounceUpdate(h);
          }}
        >
          {/* the lazy chart panels wait alone; the strip stays */}
          {bottomBlock === OVERVIEW && (
            <React.Suspense fallback={null}>
              <MobileOverviewPanel />
            </React.Suspense>
          )}
          {bottomBlock === CONSOLE && <MobileConsolePanel />}
          {bottomBlock === STACKEVENTS && <MobileStackEventPanel />}
          {bottomBlock === NETWORK && (
            <MobileNetworkPanel panelHeight={panelHeight} />
          )}
          {bottomBlock === PERFORMANCE && (
            <React.Suspense fallback={null}>
              <MobilePerformance />
            </React.Suspense>
          )}
          {bottomBlock === EXCEPTIONS && <MobileExceptions />}
          {bottomBlock === GRAPHQL && (
            <GraphQL isMobile panelHeight={panelHeight} />
          )}
        </MobileDevTools>
      ) : null}
      {!fullView ? (
        <Controls
          mobile
          setActiveTab={(tab: string) =>
            setActiveTab(activeTab === tab ? '' : tab)
          }
        />
      ) : null}
    </div>
  );
}

export default observer(Player);
