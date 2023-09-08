import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import { PlayButton, PlayingState, FullScreenButton } from 'App/player-ui';

import { Tooltip } from 'UI';
import {
  fullscreenOff,
  fullscreenOn,
  OVERVIEW,
  toggleBottomBlock,
  changeSkipInterval,
  CONSOLE, STACKEVENTS, NETWORK, PERFORMANCE, EXCEPTIONS,
} from 'Duck/components/player';
import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { fetchSessions } from 'Duck/liveSearch';

import Timeline from 'Components/Session_/Player/Controls/Timeline';
import ControlButton from 'Components/Session_/Player/Controls/ControlButton';
import PlayerControls from 'Components/Session_/Player/Controls/components/PlayerControls';

import styles from 'Components/Session_/Player/Controls/controls.module.css';
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

function Controls(props: any) {
  const { player, store } = React.useContext(MobilePlayerContext);

  const { playing, completed, skip, speed, messagesLoading } = store.get();

  const { bottomBlock, toggleBottomBlock, fullscreen, changeSkipInterval, skipInterval, session } =
    props;

  const disabled = messagesLoading;
  const sessionTz = session?.timezone;
  const onKeyDown = (e: any) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
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
                isActive={bottomBlock === OVERVIEW}
                onClick={() => toggleBottomTools(OVERVIEW)}
            />
            </div>

          <div className="flex items-center h-full">
            <DevtoolsButtons toggleBottomTools={toggleBottomTools} bottomBlock={bottomBlock} />
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

interface DevtoolsButtonsProps {
  toggleBottomTools: (blockName: number) => void;
  bottomBlock: number;
}

function DevtoolsButtons({ toggleBottomTools, bottomBlock }: DevtoolsButtonsProps) {
  const { store } = React.useContext(MobilePlayerContext);

  const { exceptionsList, logMarkedCountNow, messagesLoading, stackMarkedCountNow, resourceMarkedCountNow } = store.get();

  const showExceptions = exceptionsList.length > 0;
  return (
    <>
      <ControlButton
        disabled={messagesLoading}
        onClick={() => toggleBottomTools(CONSOLE)}
        active={bottomBlock === CONSOLE}
        label="LOGS"
        noIcon
        labelClassName="!text-base font-semibold"
        hasErrors={logMarkedCountNow > 0 || showExceptions}
        containerClassName="mx-2"
      />
      <ControlButton
        disabled={messagesLoading}
        onClick={() => toggleBottomTools(NETWORK)}
        active={bottomBlock === NETWORK}
        label="NETWORK"
        hasErrors={resourceMarkedCountNow > 0}
        noIcon
        labelClassName="!text-base font-semibold"
        containerClassName="mx-2"
      />
      {showExceptions ?
        <ControlButton
          disabled={messagesLoading}
          onClick={() => toggleBottomTools(EXCEPTIONS)}
          active={bottomBlock === EXCEPTIONS}
          hasErrors={showExceptions}
          label="EXCEPTIONS"
          noIcon
          labelClassName="!text-base font-semibold"
          containerClassName="mx-2"
        />
      : null}
      <ControlButton
        disabled={messagesLoading}
        onClick={() => toggleBottomTools(STACKEVENTS)}
        active={bottomBlock === STACKEVENTS}
        label="EVENTS"
        noIcon
        labelClassName="!text-base font-semibold"
        containerClassName="mx-2"
      />
      <ControlButton
        disabled={messagesLoading}
        onClick={() => toggleBottomTools(PERFORMANCE)}
        active={bottomBlock === PERFORMANCE}
        label="PERFORMANCE"
        noIcon
        labelClassName="!text-base font-semibold"
        containerClassName="mx-2"
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
