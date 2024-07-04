import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { connect } from 'react-redux';
import { useHistory } from 'react-router';

import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { FullScreenButton, PlayButton, PlayingState } from 'App/player-ui';
import ControlButton from 'Components/Session_/Player/Controls/ControlButton';
import Timeline from 'Components/Session_/Player/Controls/Timeline';
import {
  LaunchConsoleShortcut,
  LaunchEventsShortcut,
  LaunchNetworkShortcut,
  LaunchPerformanceShortcut,
  LaunchXRaShortcut,
} from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import PlayerControls from 'Components/Session_/Player/Controls/components/PlayerControls';
import styles from 'Components/Session_/Player/Controls/controls.module.css';
import {
  CONSOLE,
  EXCEPTIONS,
  NETWORK,
  OVERVIEW,
  PERFORMANCE,
  STACKEVENTS,
  changeSkipInterval,
  fullscreenOff,
  fullscreenOn,
  toggleBottomBlock,
} from 'Duck/components/player';
import { fetchSessions } from 'Duck/liveSearch';
import { Tooltip } from 'UI';

import { useStore } from '../../../../mstore';
import { session as sessionRoute, withSiteId } from '../../../../routes';
import { SummaryButton } from '../../../Session_/Player/Controls/Controls';
import useShortcuts from '../ReplayPlayer/useShortcuts';

export const SKIP_INTERVALS = {
  2: 2e3,
  5: 5e3,
  10: 1e4,
  15: 15e3,
  20: 2e4,
  30: 3e4,
  60: 6e4,
};

function Controls(props: any) {
  const { player, store } = React.useContext(MobilePlayerContext);
  const history = useHistory();
  const { playing, completed, skip, speed, messagesLoading } = store.get();

  const {
    bottomBlock,
    toggleBottomBlock,
    fullscreen,
    changeSkipInterval,
    skipInterval,
    session,
    setActiveTab,
    previousSessionId,
    nextSessionId,
    siteId,
    disableDevtools,
  } = props;

  const disabled = messagesLoading;
  const sessionTz = session?.timezone;

  const nextHandler = () => {
    history.push(withSiteId(sessionRoute(nextSessionId), siteId));
  };

  const prevHandler = () => {
    history.push(withSiteId(sessionRoute(previousSessionId), siteId));
  };

  useShortcuts({
    skipInterval,
    fullScreenOn: props.fullscreenOn,
    fullScreenOff: props.fullscreenOff,
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
    toggleBottomBlock(blockName);
  };

  const state = completed
                ? PlayingState.Completed
                : playing
                  ? PlayingState.Playing
                  : PlayingState.Paused;

  return (
    <div className={styles.controls}>
      <Timeline isMobile />
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
            <div className={cn('mx-2')} />
          </div>

          <div className="flex items-center h-full gap-2">
            <DevtoolsButtons
              toggleBottomTools={toggleBottomTools}
              bottomBlock={bottomBlock}
            />
            <Tooltip
              title="Fullscreen"
              delay={0}
              placement="top-start"
              className="mx-4"
            >
              <FullScreenButton
                size={16}
                onClick={props.fullscreenOn}
                customClasses={
                  'rounded hover:bg-gray-light-shade color-gray-medium'
                }
              />
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}

interface DevtoolsButtonsProps {
  toggleBottomTools: (blockName: number) => void;
  bottomBlock: number;
}

function DevtoolsButtons({
  toggleBottomTools,
  bottomBlock,
}: DevtoolsButtonsProps) {
  const { aiSummaryStore } = useStore();
  const { store, player } = React.useContext(MobilePlayerContext);

  const {
    exceptionsList,
    logMarkedCountNow,
    messagesLoading,
    stackMarkedCountNow,
    resourceMarkedCountNow,
  } = store.get();

  const showExceptions = exceptionsList.length > 0;
  // @ts-ignore
  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);

  const showSummary = () => {
    player.pause();
    if (bottomBlock !== OVERVIEW) {
      toggleBottomTools(OVERVIEW);
    }
    aiSummaryStore.setToggleSummary(!aiSummaryStore.toggleSummary);
  };
  return (
    <>
      {isSaas ? (
        <SummaryButton
          onClick={showSummary}
          withToggle={bottomBlock === OVERVIEW}
          toggleValue={aiSummaryStore.toggleSummary}
        />
      ) : null}
      <ControlButton
        popover={
          <div className={'flex items-center gap-2'}>
            <LaunchXRaShortcut />
            <div>Get a quick overview on the issues in this session.</div>
          </div>
        }
        label={'X-Ray'}
        onClick={() => toggleBottomTools(OVERVIEW)}
        active={bottomBlock === OVERVIEW}
      />
      <ControlButton
        popover={
          <div className={'flex gap-2 items-center'}>
            <LaunchConsoleShortcut />
            <div>Launch Logs</div>
          </div>
        }
        disabled={messagesLoading}
        onClick={() => toggleBottomTools(CONSOLE)}
        active={bottomBlock === CONSOLE}
        label="Logs"
        hasErrors={logMarkedCountNow > 0 || showExceptions}
      />
      <ControlButton
        popover={
          <div className={'flex gap-2 items-center'}>
            <LaunchNetworkShortcut />
            <div>Launch Network</div>
          </div>
        }
        disabled={messagesLoading}
        onClick={() => toggleBottomTools(NETWORK)}
        active={bottomBlock === NETWORK}
        label="Network"
        hasErrors={resourceMarkedCountNow > 0}
      />
      {showExceptions ? (
        <ControlButton
          disabled={messagesLoading}
          onClick={() => toggleBottomTools(EXCEPTIONS)}
          active={bottomBlock === EXCEPTIONS}
          hasErrors={showExceptions}
          label="Exceptions"
        />
      ) : null}
      <ControlButton
        popover={
          <div className={'flex gap-2 items-center'}>
            <LaunchEventsShortcut />
            <div>Launch Events</div>
          </div>
        }
        disabled={messagesLoading}
        onClick={() => toggleBottomTools(STACKEVENTS)}
        active={bottomBlock === STACKEVENTS}
        label="Events"
      />
      <ControlButton
        popover={
          <div className={'flex gap-2 items-center'}>
            <LaunchPerformanceShortcut />
            <div>Launch Performance</div>
          </div>
        }
        disabled={messagesLoading}
        onClick={() => toggleBottomTools(PERFORMANCE)}
        active={bottomBlock === PERFORMANCE}
        label="Performance"
      />
    </>
  );
}

const ControlPlayer = observer(Controls);

export default connect(
  (state: any) => {
    const permissions = state.getIn(['user', 'account', 'permissions']) || [];
    const isEnterprise = state.getIn(['user', 'account', 'edition']) === 'ee';
    return {
      disableDevtools: isEnterprise && !(permissions.includes('DEV_TOOLS') || permissions.includes('SERVICE_DEV_TOOLS')),
      fullscreen: state.getIn(['components', 'player', 'fullscreen']),
      bottomBlock: state.getIn(['components', 'player', 'bottomBlock']),
      showStorageRedux: !state.getIn([
        'components',
        'player',
        'hiddenHints',
        'storage',
      ]),
      showStackRedux: !state.getIn([
        'components',
        'player',
        'hiddenHints',
        'stack',
      ]),
      session: state.getIn(['sessions', 'current']),
      totalAssistSessions: state.getIn(['liveSearch', 'total']),
      skipInterval: state.getIn(['components', 'player', 'skipInterval']),
      previousSessionId: state.getIn(['sessions', 'previousId']),
      nextSessionId: state.getIn(['sessions', 'nextId']),
      siteId: state.getIn(['site', 'siteId']),
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
