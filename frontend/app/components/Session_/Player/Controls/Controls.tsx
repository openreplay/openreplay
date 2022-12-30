import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import { STORAGE_TYPES, selectStorageType } from 'Player';
import LiveTag from 'Shared/LiveTag';
import AssistSessionsTabs from './AssistSessionsTabs';

import { Icon, Tooltip } from 'UI';
import {
  fullscreenOn,
  fullscreenOff,
  toggleBottomBlock,
  changeSkipInterval,
  OVERVIEW,
  CONSOLE,
  NETWORK,
  STACKEVENTS,
  STORAGE,
  PROFILER,
  PERFORMANCE,
  GRAPHQL,
  INSPECTOR,
} from 'Duck/components/player';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { fetchSessions } from 'Duck/liveSearch';

import { AssistDuration } from './Time';
import Timeline from './Timeline';
import ControlButton from './ControlButton';
import PlayerControls from './components/PlayerControls';

import styles from './controls.module.css';
import XRayButton from 'Shared/XRayButton';

const SKIP_INTERVALS = {
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

  const { jumpToLive, toggleInspectorMode } = player;
  const {
    live,
    livePlay,
    playing,
    completed,
    skip,
    // skipToIssue, UPDATE
    speed,
    cssLoading,
    messagesLoading,
    inspectorMode,
    markedTargets,
    // messagesLoading: fullscreenDisabled, UPDATE
    // stackList,
    exceptionsList,
    profilesList,
    graphqlList,
    // fetchList,
    liveTimeTravel,
    logMarkedCountNow: logRedCount,
    resourceMarkedCountNow: resourceRedCount,
    stackMarkedCountNow: stackRedCount,
  } = store.get();
  // const storageCount = selectStorageListNow(store.get()).length UPDATE
  const {
    bottomBlock,
    toggleBottomBlock,
    fullscreen,
    closedLive,
    changeSkipInterval,
    skipInterval,
    disabledRedux,
    showStorageRedux,
    session,
    // showStackRedux,
    fetchSessions: fetchAssistSessions,
    totalAssistSessions,
  } = props;

  const isAssist = window.location.pathname.includes('/assist/');
  const storageType = selectStorageType(store.get());
  const disabled = disabledRedux || cssLoading || messagesLoading || inspectorMode || markedTargets;
  const profilesCount = profilesList.length;
  const graphqlCount = graphqlList.length;
  const showGraphql = graphqlCount > 0;
  const showProfiler = profilesCount > 0;
  const showExceptions = exceptionsList.length > 0;
  const showStorage = storageType !== STORAGE_TYPES.NONE || showStorageRedux;
  // const fetchCount = fetchList.length;
  // const stackCount = stackList.length;
  // const showStack =  stackCount > 0 || showStackRedux UPDATE
  // const showFetch = fetchCount > 0 UPDATE

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
    if (isAssist && totalAssistSessions === 0) {
      fetchAssistSessions();
    }
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

  const renderPlayBtn = () => {
    let label;
    let icon;
    if (completed) {
      icon = 'arrow-clockwise' as const;
      label = 'Replay this session';
    } else if (playing) {
      icon = 'pause-fill' as const;
      label = 'Pause';
    } else {
      icon = 'play-fill-new' as const;
      label = 'Pause';
      label = 'Play';
    }

    return (
      <Tooltip title={label} className="mr-4">
        <div
          onClick={() => player.togglePlay()}
          className="hover-main color-main cursor-pointer rounded hover:bg-gray-light-shade"
        >
          <Icon name={icon} size="36" color="inherit" />
        </div>
      </Tooltip>
    );
  };

  const controlIcon = (
    icon: string,
    size: number,
    action: (args: any) => any,
    isBackwards: boolean,
    additionalClasses: string
  ) => (
    <div
      onClick={action}
      className={cn('py-1 px-2 hover-main cursor-pointer bg-gray-lightest', additionalClasses)}
      style={{ transform: isBackwards ? 'rotate(180deg)' : '' }}
    >
      <Icon
        // @ts-ignore
        name={icon}
        size={size}
        color="inherit"
      />
    </div>
  );

  const toggleBottomTools = (blockName: number) => {
    if (blockName === INSPECTOR) {
      // player.toggleInspectorMode(false);
      bottomBlock && toggleBottomBlock();
    } else {
      // player.toggleInspectorMode(false);
      toggleBottomBlock(blockName);
    }
  };

  return (
    <div className={styles.controls}>
      <Timeline
        live={live}
        jump={(t: number) => player.jump(t)}
        liveTimeTravel={liveTimeTravel}
        pause={() => player.pause()}
        togglePlay={() => player.togglePlay()}
      />
      {!fullscreen && (
        <div className={cn(styles.buttons, live ? '!px-5 !pt-0' : '!px-2')} data-is-live={live}>
          <div className="flex items-center">
            {!live && (
              <>
                <PlayerControls
                  live={live}
                  skip={skip}
                  speed={speed}
                  disabled={disabled}
                  backTenSeconds={backTenSeconds}
                  forthTenSeconds={forthTenSeconds}
                  toggleSpeed={() => player.toggleSpeed()}
                  toggleSkip={() => player.toggleSkip()}
                  playButton={renderPlayBtn()}
                  controlIcon={controlIcon}
                  skipIntervals={SKIP_INTERVALS}
                  setSkipInterval={changeSkipInterval}
                  currentInterval={skipInterval}
                />
                <div className={cn('mx-2')} />
                <XRayButton
                  isActive={bottomBlock === OVERVIEW && !inspectorMode}
                  onClick={() => toggleBottomTools(OVERVIEW)}
                />
              </>
            )}

            {live && !closedLive && (
              <div className={styles.buttonsLeft}>
                <LiveTag isLive={livePlay} onClick={() => (livePlay ? null : jumpToLive())} />
                <div className="font-semibold px-2">
                  <AssistDuration />
                </div>
              </div>
            )}
          </div>

          {isAssist && totalAssistSessions > 1 ? (
            <div>
              <AssistSessionsTabs session={session} />
            </div>
          ) : null}

          <div className="flex items-center h-full">
            <ControlButton
              disabled={disabled && !inspectorMode}
              onClick={() => toggleBottomTools(CONSOLE)}
              active={bottomBlock === CONSOLE && !inspectorMode}
              label="CONSOLE"
              noIcon
              labelClassName="!text-base font-semibold"
              hasErrors={logRedCount > 0 || showExceptions}
              containerClassName="mx-2"
            />
            {!live && (
              <ControlButton
                disabled={disabled && !inspectorMode}
                onClick={() => toggleBottomTools(NETWORK)}
                active={bottomBlock === NETWORK && !inspectorMode}
                label="NETWORK"
                hasErrors={resourceRedCount > 0}
                noIcon
                labelClassName="!text-base font-semibold"
                containerClassName="mx-2"
              />
            )}
            {!live && (
              <ControlButton
                disabled={disabled && !inspectorMode}
                onClick={() => toggleBottomTools(PERFORMANCE)}
                active={bottomBlock === PERFORMANCE && !inspectorMode}
                label="PERFORMANCE"
                noIcon
                labelClassName="!text-base font-semibold"
                containerClassName="mx-2"
              />
            )}
            {!live && showGraphql && (
              <ControlButton
                disabled={disabled && !inspectorMode}
                onClick={() => toggleBottomTools(GRAPHQL)}
                active={bottomBlock === GRAPHQL && !inspectorMode}
                label="GRAPHQL"
                noIcon
                labelClassName="!text-base font-semibold"
                containerClassName="mx-2"
              />
            )}
            {!live && showStorage && (
              <ControlButton
                disabled={disabled && !inspectorMode}
                onClick={() => toggleBottomTools(STORAGE)}
                active={bottomBlock === STORAGE && !inspectorMode}
                label={getStorageName(storageType)}
                noIcon
                labelClassName="!text-base font-semibold"
                containerClassName="mx-2"
              />
            )}
            {!live && (
              <ControlButton
                disabled={disabled && !inspectorMode}
                onClick={() => toggleBottomTools(STACKEVENTS)}
                active={bottomBlock === STACKEVENTS && !inspectorMode}
                label="EVENTS"
                noIcon
                labelClassName="!text-base font-semibold"
                containerClassName="mx-2"
                hasErrors={stackRedCount > 0}
              />
            )}
            {!live && showProfiler && (
              <ControlButton
                disabled={disabled && !inspectorMode}
                onClick={() => toggleBottomTools(PROFILER)}
                active={bottomBlock === PROFILER && !inspectorMode}
                label="PROFILER"
                noIcon
                labelClassName="!text-base font-semibold"
                containerClassName="mx-2"
              />
            )}
            {!live && (
              <Tooltip title="Fullscreen" delay={0} placement="top-start" className="mx-4">
                {controlIcon(
                  'arrows-angle-extend',
                  16,
                  props.fullscreenOn,
                  false,
                  'rounded hover:bg-gray-light-shade color-gray-medium'
                )}
              </Tooltip>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
      closedLive:
        !!state.getIn(['sessions', 'errors']) || !state.getIn(['sessions', 'current']).live,
      skipInterval: state.getIn(['components', 'player', 'skipInterval']),
    };
  },
  {
    fullscreenOn,
    fullscreenOff,
    toggleBottomBlock,
    changeSkipInterval,
    fetchSessions,
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
