import { STORAGE_TYPES, StorageType, selectStorageType } from 'Player';
import { Switch } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { FullScreenButton, PlayButton, PlayingState } from 'App/player-ui';
import { session as sessionRoute, withSiteId } from 'App/routes';
import DropdownAudioPlayer from 'Components/Session/Player/ReplayPlayer/AudioPlayer';
import useShortcuts from 'Components/Session/Player/ReplayPlayer/useShortcuts';
import {
  LaunchConsoleShortcut,
  LaunchEventsShortcut,
  LaunchNetworkShortcut,
  LaunchPerformanceShortcut,
  LaunchStateShortcut,
  LaunchXRaShortcut
} from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import {
  CONSOLE,
  GRAPHQL,
  INSPECTOR,
  NETWORK,
  OVERVIEW,
  PERFORMANCE,
  PROFILER,
  STACKEVENTS,
  STORAGE
} from 'App/mstore/uiPlayerStore';
import { Icon } from 'UI';

import ControlButton from './ControlButton';
import Timeline from './Timeline';
import PlayerControls from './components/PlayerControls';
import styles from './controls.module.css';

export const SKIP_INTERVALS = {
  2: 2e3,
  5: 5e3,
  10: 1e4,
  15: 15e3,
  20: 2e4,
  30: 3e4,
  60: 6e4
};

function getStorageName(type: any) {
  switch (type) {
    case STORAGE_TYPES.REDUX:
      return 'Redux';
    case STORAGE_TYPES.MOBX:
      return 'Mobx';
    case STORAGE_TYPES.VUEX:
      return 'Vuex';
    case STORAGE_TYPES.NGRX:
      return 'NgRx';
    case STORAGE_TYPES.ZUSTAND:
      return 'Zustand';
    case STORAGE_TYPES.NONE:
      return 'State';
    default:
      return 'State';
  }
}

function Controls({
  setActiveTab
}: any) {
  const { player, store } = React.useContext(PlayerContext);
  const { uxtestingStore, uiPlayerStore, projectsStore, sessionStore, userStore } = useStore();
  const permissions = userStore.account.permissions || [];
  const disableDevtools = userStore.isEnterprise && !(permissions.includes('DEV_TOOLS') || permissions.includes('SERVICE_DEV_TOOLS'));
  const fullscreen = uiPlayerStore.fullscreen;
  const bottomBlock = uiPlayerStore.bottomBlock;
  const toggleBottomBlock = uiPlayerStore.toggleBottomBlock;
  const fullscreenOn = uiPlayerStore.fullscreenOn;
  const fullscreenOff = uiPlayerStore.fullscreenOff;
  const changeSkipInterval = uiPlayerStore.changeSkipInterval;
  const skipInterval = uiPlayerStore.skipInterval;
  const showStorageRedux = !uiPlayerStore.hiddenHints.storage;
  const history = useHistory();
  const siteId = projectsStore.siteId;
  const {
    playing,
    completed,
    skip,
    speed,
    messagesLoading,
    markedTargets,
    inspectorMode
  } = store.get();

  const session = sessionStore.current;
  const previousSessionId = sessionStore.previousId;
  const nextSessionId = sessionStore.nextId;

  const disabled =
    disableDevtools || messagesLoading || inspectorMode || markedTargets;
  const sessionTz = session?.timezone;

  const nextHandler = () => {
    history.push(withSiteId(sessionRoute(nextSessionId), siteId));
  };

  const prevHandler = () => {
    history.push(withSiteId(sessionRoute(previousSessionId), siteId));
  };

  useShortcuts({
    skipInterval,
    fullScreenOn: fullscreenOn,
    fullScreenOff: fullscreenOff,
    toggleBottomBlock,
    openNextSession: nextHandler,
    openPrevSession: prevHandler,
    setActiveTab,
    disableDevtools
  });

  const forthTenSeconds = () => {
    // @ts-ignore
    player.jumpInterval(SKIP_INTERVALS[skipInterval]);
  };

  const backTenSeconds = () => {
    // @ts-ignore
    player.jumpInterval(-SKIP_INTERVALS[skipInterval]);
  };

  const toggleBottomTools = (blockName: number) => {
    player.toggleInspectorMode(false);
    toggleBottomBlock(blockName);
  };

  const state = completed
    ? PlayingState.Completed
    : playing
      ? PlayingState.Playing
      : PlayingState.Paused;

  const events = session.stackEvents ?? [];
  return (
    <div className={styles.controls}>
      <Timeline />
      {!fullscreen && (
        <div className={cn(styles.buttons, '!px-2')}>
          <div className="flex items-center">
            <PlayerControls
              skip={skip}
              sessionTz={sessionTz}
              speed={speed}
              disabled={disabled}
              backTenSeconds={backTenSeconds}
              forthTenSeconds={forthTenSeconds}
              toggleSpeed={(speedIndex) => player.toggleSpeed(speedIndex)}
              toggleSkip={() => player.toggleSkip()}
              playButton={
                <PlayButton
                  state={state}
                  togglePlay={player.togglePlay}
                  iconSize={36}
                />
              }
              skipIntervals={SKIP_INTERVALS}
              setSkipInterval={changeSkipInterval}
              currentInterval={skipInterval}
              startedAt={session.startedAt}
            />
            <div className={cn('mx-1')} />
          </div>

          <div className="flex gap-2 items-center h-full">
            {uxtestingStore.hideDevtools && uxtestingStore.isUxt() ? null : (
              <DevtoolsButtons
                showStorageRedux={showStorageRedux}
                toggleBottomTools={toggleBottomTools}
                bottomBlock={bottomBlock}
                disabled={disabled}
                events={events}
              />
            )}

            <FullScreenButton
              size={16}
              onClick={fullscreenOn}
              customClasses={
                'rounded hover:bg-gray-light-shade color-gray-medium'
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface IDevtoolsButtons {
  showStorageRedux: boolean;
  toggleBottomTools: (blockName: number) => void;
  bottomBlock: number;
  disabled: boolean;
  events: any[];
}

const DevtoolsButtons = observer(
  ({
     showStorageRedux,
     toggleBottomTools,
     bottomBlock,
     disabled,
     events
   }: IDevtoolsButtons) => {
    const { aiSummaryStore } = useStore();
    const { store, player } = React.useContext(PlayerContext);

    // @ts-ignore
    const originStr = window.env.ORIGIN || window.location.origin;
    const isSaas = /app\.openreplay\.com/.test(originStr);

    const { inspectorMode, currentTab, tabStates } = store.get();

    const disableButtons = disabled;

    const profilesList = tabStates[currentTab]?.profilesList || [];
    const graphqlList = tabStates[currentTab]?.graphqlList || [];
    const logRedCount = tabStates[currentTab]?.logMarkedCountNow || 0;
    const resourceRedCount = tabStates[currentTab]?.resourceMarkedCountNow || 0;
    const stackRedCount = tabStates[currentTab]?.stackMarkedCountNow || 0;
    const exceptionsList = tabStates[currentTab]?.exceptionsList || [];

    const storageType = store.get().tabStates[currentTab]
      ? selectStorageType(store.get().tabStates[currentTab])
      : StorageType.NONE;
    const profilesCount = profilesList.length;
    const graphqlCount = graphqlList.length;
    const showGraphql = graphqlCount > 0;
    const showProfiler = profilesCount > 0;
    const showExceptions = exceptionsList.length > 0;
    const showStorage = storageType !== STORAGE_TYPES.NONE || showStorageRedux;

    const showSummary = () => {
      player.pause();
      if (bottomBlock !== OVERVIEW) {
        toggleBottomTools(OVERVIEW);
      }
      aiSummaryStore.setToggleSummary(!aiSummaryStore.toggleSummary);
    };

    const possibleAudio = events.filter((e) => e.name.includes('media/audio'));
    return (
      <>
        {isSaas ? <SummaryButton onClick={showSummary} /> : null}
        <ControlButton
          popover={
            <div className={'flex items-center gap-2'}>
              <LaunchXRaShortcut />
              <div>Get a quick overview on the issues in this session.</div>
            </div>
          }
          label={'X-Ray'}
          onClick={() => toggleBottomTools(OVERVIEW)}
          active={bottomBlock === OVERVIEW && !inspectorMode}
        />

        <ControlButton
          popover={
            <div className={'flex gap-2 items-center'}>
              <LaunchConsoleShortcut />
              <div>Launch Console</div>
            </div>
          }
          disabled={disableButtons}
          onClick={() => toggleBottomTools(CONSOLE)}
          active={bottomBlock === CONSOLE && !inspectorMode}
          label="Console"
          hasErrors={logRedCount > 0 || showExceptions}
        />

        <ControlButton
          popover={
            <div className={'flex gap-2 items-center'}>
              <LaunchNetworkShortcut />
              <div>Launch Network</div>
            </div>
          }
          disabled={disableButtons}
          onClick={() => toggleBottomTools(NETWORK)}
          active={bottomBlock === NETWORK && !inspectorMode}
          label="Network"
          hasErrors={resourceRedCount > 0}
        />

        <ControlButton
          popover={
            <div className={'flex gap-2 items-center'}>
              <LaunchPerformanceShortcut />
              <div>Launch Performance</div>
            </div>
          }
          disabled={disableButtons}
          onClick={() => toggleBottomTools(PERFORMANCE)}
          active={bottomBlock === PERFORMANCE && !inspectorMode}
          label="Performance"
        />

        {showGraphql && (
          <ControlButton
            disabled={disableButtons}
            onClick={() => toggleBottomTools(GRAPHQL)}
            active={bottomBlock === GRAPHQL && !inspectorMode}
            label="Graphql"
          />
        )}

        {showStorage && (
          <ControlButton
            popover={
              <div className={'flex gap-2 items-center'}>
                <LaunchStateShortcut />
                <div>Launch State</div>
              </div>
            }
            disabled={disableButtons}
            onClick={() => toggleBottomTools(STORAGE)}
            active={bottomBlock === STORAGE && !inspectorMode}
            label={getStorageName(storageType) as string}
          />
        )}
        <ControlButton
          popover={
            <div className={'flex gap-2 items-center'}>
              <LaunchEventsShortcut />
              <div>Launch Events</div>
            </div>
          }
          disabled={disableButtons}
          onClick={() => toggleBottomTools(STACKEVENTS)}
          active={bottomBlock === STACKEVENTS && !inspectorMode}
          label="Events"
          hasErrors={stackRedCount > 0}
        />
        {showProfiler && (
          <ControlButton
            disabled={disableButtons}
            onClick={() => toggleBottomTools(PROFILER)}
            active={bottomBlock === PROFILER && !inspectorMode}
            label="Profiler"
          />
        )}
        {possibleAudio.length ? (
          <DropdownAudioPlayer audioEvents={possibleAudio} />
        ) : null}
      </>
    );
  }
);

export function SummaryButton({
                                onClick,
                                withToggle,
                                onToggle,
                                toggleValue
                              }: {
  onClick?: () => void;
  withToggle?: boolean;
  onToggle?: () => void;
  toggleValue?: boolean;
}) {
  const [isHovered, setHovered] = React.useState(false);

  return (
    <div style={gradientButton} onClick={onClick}>
      <div
        style={isHovered ? onHoverFillStyle : fillStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {withToggle ? (
          <Switch size={'small'} checked={toggleValue} onChange={onToggle} />
        ) : null}
        <Icon name={'sparkles'} size={16} />
        <div className={'font-semibold text-main'}>Summary AI</div>
      </div>
    </div>
  );
}

export const gradientButton = {
  border: 'double 1px transparent',
  borderRadius: '60px',
  background:
    'linear-gradient(#f6f6f6, #f6f6f6), linear-gradient(to right, #394EFF 0%, #3EAAAF 100%)',
  backgroundOrigin: 'border-box',
  backgroundClip: 'content-box, border-box',
  cursor: 'pointer',
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
const onHoverFillStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  borderRadius: '60px',
  gap: 2,
  alignItems: 'center',
  padding: '1px 8px',
  background: 'linear-gradient(156deg, #E3E6FF 0%, #E4F3F4 69.48%)'
};
const fillStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  borderRadius: '60px',
  gap: 2,
  alignItems: 'center',
  padding: '1px 8px'
};

export default observer(Controls);
