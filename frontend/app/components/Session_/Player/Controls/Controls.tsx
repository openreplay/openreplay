import { useStore } from "App/mstore";
import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import { selectStorageType, STORAGE_TYPES, StorageType } from 'Player';
import { PlayButton, PlayingState, FullScreenButton } from 'App/player-ui'

import { Tooltip } from 'UI';
import {
  CONSOLE,
  fullscreenOff,
  fullscreenOn,
  GRAPHQL,
  INSPECTOR,
  NETWORK,
  OVERVIEW,
  PERFORMANCE,
  PROFILER,
  STACKEVENTS,
  STORAGE,
  toggleBottomBlock,
  changeSkipInterval,
} from 'Duck/components/player';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { fetchSessions } from 'Duck/liveSearch';

import Timeline from './Timeline';
import ControlButton from './ControlButton';
import PlayerControls from './components/PlayerControls';

import styles from './controls.module.css';
import XRayButton from 'Shared/XRayButton';
import CreateNote from 'Components/Session_/Player/Controls/components/CreateNote';

export const SKIP_INTERVALS = {
  2: 2e3,
  5: 5e3,
  10: 1e4,
  15: 15e3,
  20: 2e4,
  30: 3e4,
  60: 6e4,
};

function getStorageName(type: any) {
  switch (type) {
    case STORAGE_TYPES.REDUX:
      return 'REDUX';
    case STORAGE_TYPES.MOBX:
      return 'MOBX';
    case STORAGE_TYPES.VUEX:
      return 'VUEX';
    case STORAGE_TYPES.NGRX:
      return 'NGRX';
    case STORAGE_TYPES.ZUSTAND:
      return 'ZUSTAND';
    case STORAGE_TYPES.NONE:
      return 'STATE';
  }
}

function Controls(props: any) {
  const { player, store } = React.useContext(PlayerContext);
  const { uxtestingStore } = useStore();
  
  const {
    playing,
    completed,
    skip,
    speed,
    messagesLoading,
    markedTargets,
    inspectorMode,
  } = store.get();

  const {
    bottomBlock,
    toggleBottomBlock,
    fullscreen,
    changeSkipInterval,
    skipInterval,
    disabledRedux,
    showStorageRedux,
    session,
  } = props;

  const disabled = disabledRedux || messagesLoading || inspectorMode || markedTargets;
  const sessionTz = session?.timezone;
  const onKeyDown = (e: any) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (inspectorMode) {
      if (e.key === 'Esc' || e.key === 'Escape') {
        player.toggleInspectorMode(false);
      }
    }
    if (e.key === 'Esc' || e.key === 'Escape') {
      props.fullscreenOff();
    }
    if (e.key === 'ArrowRight') {
      forthTenSeconds();
    }
    if (e.key === 'ArrowLeft') {
      backTenSeconds();
    }
    if (e.key === 'ArrowDown') {
      player.speedDown();
    }
    if (e.key === 'ArrowUp') {
      player.speedUp();
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', onKeyDown.bind(this));
    return () => {
      document.removeEventListener('keydown', onKeyDown.bind(this));
    };
  }, []);

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

  const state = completed ? PlayingState.Completed : playing ? PlayingState.Playing : PlayingState.Paused

  return (
    <div className={styles.controls}>
      <Timeline />
      <CreateNote />
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
              playButton={<PlayButton state={state} togglePlay={player.togglePlay} iconSize={36} />}
              skipIntervals={SKIP_INTERVALS}
              setSkipInterval={changeSkipInterval}
              currentInterval={skipInterval}
              startedAt={session.startedAt}
            />
            <div className={cn('mx-2')} />
            <XRayButton
              isActive={bottomBlock === OVERVIEW && !inspectorMode}
              onClick={() => toggleBottomTools(OVERVIEW)}
            />
          </div>

          <div className="flex items-center h-full">
            {uxtestingStore.hideDevtools && uxtestingStore.isUxt() ? null :
              <DevtoolsButtons
                showStorageRedux={showStorageRedux}
                toggleBottomTools={toggleBottomTools}
                bottomBlock={bottomBlock}
                disabled={disabled}
              />
            }
            <Tooltip title="Fullscreen" delay={0} placement="top-start" className="mx-4">
              <FullScreenButton
                size={16}
                onClick={props.fullscreenOn}
                customClasses={'rounded hover:bg-gray-light-shade color-gray-medium'}
              />
            </Tooltip>
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
}

const DevtoolsButtons = observer(({ showStorageRedux, toggleBottomTools, bottomBlock, disabled }: IDevtoolsButtons) => {
  const { store } = React.useContext(PlayerContext);

  const {
    inspectorMode,
    currentTab,
    tabStates
  } = store.get();

  const disableButtons = disabled;

  const profilesList = tabStates[currentTab]?.profilesList || [];
  const graphqlList = tabStates[currentTab]?.graphqlList || [];
  const logRedCount = tabStates[currentTab]?.logMarkedCountNow || 0;
  const resourceRedCount = tabStates[currentTab]?.resourceMarkedCountNow || 0;
  const stackRedCount = tabStates[currentTab]?.stackMarkedCountNow || 0;
  const exceptionsList = tabStates[currentTab]?.exceptionsList || [];

  const storageType = store.get().tabStates[currentTab] ? selectStorageType(store.get().tabStates[currentTab]) : StorageType.NONE
  const profilesCount = profilesList.length;
  const graphqlCount = graphqlList.length;
  const showGraphql = graphqlCount > 0;
  const showProfiler = profilesCount > 0;
  const showExceptions = exceptionsList.length > 0;
  const showStorage = storageType !== STORAGE_TYPES.NONE || showStorageRedux;
  return (
    <>
      <ControlButton
        disabled={disableButtons}
        onClick={() => toggleBottomTools(CONSOLE)}
        active={bottomBlock === CONSOLE && !inspectorMode}
        label="CONSOLE"
        noIcon
        labelClassName="!text-base font-semibold"
        hasErrors={logRedCount > 0 || showExceptions}
        containerClassName="mx-2"
      />

    <ControlButton
      disabled={disableButtons}
      onClick={() => toggleBottomTools(NETWORK)}
      active={bottomBlock === NETWORK && !inspectorMode}
      label="NETWORK"
      hasErrors={resourceRedCount > 0}
      noIcon
      labelClassName="!text-base font-semibold"
      containerClassName="mx-2"
    />

    <ControlButton
      disabled={disableButtons}
      onClick={() => toggleBottomTools(PERFORMANCE)}
      active={bottomBlock === PERFORMANCE && !inspectorMode}
      label="PERFORMANCE"
      noIcon
      labelClassName="!text-base font-semibold"
      containerClassName="mx-2"
    />

    {showGraphql && (
      <ControlButton
        disabled={disableButtons}
        onClick={() => toggleBottomTools(GRAPHQL)}
        active={bottomBlock === GRAPHQL && !inspectorMode}
        label="GRAPHQL"
        noIcon
        labelClassName="!text-base font-semibold"
        containerClassName="mx-2"
      />
    )}

    {showStorage && (
      <ControlButton
        disabled={disableButtons}
        onClick={() => toggleBottomTools(STORAGE)}
        active={bottomBlock === STORAGE && !inspectorMode}
        label={getStorageName(storageType)}
        noIcon
        labelClassName="!text-base font-semibold"
        containerClassName="mx-2"
      />
    )}
    <ControlButton
      disabled={disableButtons}
      onClick={() => toggleBottomTools(STACKEVENTS)}
      active={bottomBlock === STACKEVENTS && !inspectorMode}
      label="EVENTS"
      noIcon
      labelClassName="!text-base font-semibold"
      containerClassName="mx-2"
      hasErrors={stackRedCount > 0}
    />
    {showProfiler && (
      <ControlButton
        disabled={disableButtons}
        onClick={() => toggleBottomTools(PROFILER)}
        active={bottomBlock === PROFILER && !inspectorMode}
        label="PROFILER"
        noIcon
        labelClassName="!text-base font-semibold"
        containerClassName="mx-2"
      />
    )}
    </>
  )
})

const ControlPlayer = observer(Controls);

export default connect(
  (state: any) => {
    const permissions = state.getIn(['user', 'account', 'permissions']) || [];
    const isEnterprise = state.getIn(['user', 'account', 'edition']) === 'ee';
    return {
      disabledRedux: isEnterprise && !permissions.includes('DEV_TOOLS'),
      fullscreen: state.getIn(['components', 'player', 'fullscreen']),
      bottomBlock: state.getIn(['components', 'player', 'bottomBlock']),
      showStorageRedux: !state.getIn(['components', 'player', 'hiddenHints', 'storage']),
      showStackRedux: !state.getIn(['components', 'player', 'hiddenHints', 'stack']),
      session: state.getIn(['sessions', 'current']),
      totalAssistSessions: state.getIn(['liveSearch', 'total']),
      skipInterval: state.getIn(['components', 'player', 'skipInterval']),
    };
  },
  {
    fullscreenOn,
    fullscreenOff,
    toggleBottomBlock,
    fetchSessions,
    changeSkipInterval,
  }
)(ControlPlayer);

// shouldComponentUpdate(nextProps) {
//   if (
//     nextProps.fullscreen !== props.fullscreen ||
//     nextProps.bottomBlock !== props.bottomBlock ||
//     nextProps.live !== props.live ||
//     nextProps.livePlay !== props.livePlay ||
//     nextProps.playing !== props.playing ||
//     nextProps.completed !== props.completed ||
//     nextProps.skip !== props.skip ||
//     nextProps.skipToIssue !== props.skipToIssue ||
//     nextProps.speed !== props.speed ||
//     nextProps.disabled !== props.disabled ||
//     nextProps.fullscreenDisabled !== props.fullscreenDisabled ||
//     // nextProps.inspectorMode !== props.inspectorMode ||
//     // nextProps.logCount !== props.logCount ||
//     nextProps.logRedCount !== props.logRedCount ||
//     nextProps.showExceptions !== props.showExceptions ||
//     nextProps.resourceRedCount !== props.resourceRedCount ||
//     nextProps.fetchRedCount !== props.fetchRedCount ||
//     nextProps.showStack !== props.showStack ||
//     nextProps.stackCount !== props.stackCount ||
//     nextProps.stackRedCount !== props.stackRedCount ||
//     nextProps.profilesCount !== props.profilesCount ||
//     nextProps.storageCount !== props.storageCount ||
//     nextProps.storageType !== props.storageType ||
//     nextProps.showStorage !== props.showStorage ||
//     nextProps.showProfiler !== props.showProfiler ||
//     nextProps.showGraphql !== props.showGraphql ||
//     nextProps.showFetch !== props.showFetch ||
//     nextProps.fetchCount !== props.fetchCount ||
//     nextProps.graphqlCount !== props.graphqlCount ||
//     nextProps.liveTimeTravel !== props.liveTimeTravel ||
//     nextProps.skipInterval !== props.skipInterval
//   )
//     return true;
//   return false;
// }
