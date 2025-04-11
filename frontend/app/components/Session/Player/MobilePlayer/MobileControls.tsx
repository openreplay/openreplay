import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
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
import { Tooltip } from 'UI';
import {
  CONSOLE,
  EXCEPTIONS,
  NETWORK,
  OVERVIEW,
  PERFORMANCE,
  STACKEVENTS,
} from 'App/mstore/uiPlayerStore';
import { useStore } from 'App/mstore';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { SummaryButton } from 'Components/Session_/Player/Controls/Controls';
import useShortcuts from '../ReplayPlayer/useShortcuts';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { sessionStore, userStore } = useStore();
  const permissions = userStore.account.permissions || [];
  const disableDevtools =
    userStore.isEnterprise &&
    !(
      permissions.includes('DEV_TOOLS') ||
      permissions.includes('SERVICE_DEV_TOOLS')
    );
  const { player, store } = React.useContext(MobilePlayerContext);
  const history = useHistory();
  const { playing, completed, skip, speed, messagesLoading } = store.get();
  const { uiPlayerStore, projectsStore } = useStore();
  const { fullscreen } = uiPlayerStore;
  const { bottomBlock } = uiPlayerStore;
  const { toggleBottomBlock } = uiPlayerStore;
  const { fullscreenOn } = uiPlayerStore;
  const { fullscreenOff } = uiPlayerStore;
  const { changeSkipInterval } = uiPlayerStore;
  const { skipInterval } = uiPlayerStore;
  const { siteId } = projectsStore;
  const { setActiveTab } = props;
  const session = sessionStore.current;
  const previousSessionId = sessionStore.previousId;
  const nextSessionId = sessionStore.nextId;

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
    fullScreenOn: fullscreenOn,
    fullScreenOff: fullscreenOff,
    toggleBottomBlock,
    openNextSession: nextHandler,
    openPrevSession: prevHandler,
    setActiveTab,
    disableDevtools,
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
              title={t('Fullscreen')}
              delay={0}
              placement="top-start"
              className="mx-4"
            >
              <FullScreenButton
                size={16}
                onClick={fullscreenOn}
                customClasses="rounded hover:bg-gray-light-shade color-gray-medium"
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

const DevtoolsButtons = observer(
  ({ toggleBottomTools, bottomBlock }: DevtoolsButtonsProps) => {
    const { t } = useTranslation();
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
            <div className="flex items-center gap-2">
              <LaunchXRaShortcut />
              <div>
                {t('Get a quick overview on the issues in this session.')}
              </div>
            </div>
          }
          label="X-Ray"
          onClick={() => toggleBottomTools(OVERVIEW)}
          active={bottomBlock === OVERVIEW}
        />
        <ControlButton
          popover={
            <div className="flex gap-2 items-center">
              <LaunchConsoleShortcut />
              <div>{t('Launch Logs')}</div>
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
            <div className="flex gap-2 items-center">
              <LaunchNetworkShortcut />
              <div>{t('Launch Network')}</div>
            </div>
          }
          disabled={messagesLoading}
          onClick={() => toggleBottomTools(NETWORK)}
          active={bottomBlock === NETWORK}
          label={t('Network')}
          hasErrors={resourceMarkedCountNow > 0}
        />
        {showExceptions ? (
          <ControlButton
            disabled={messagesLoading}
            onClick={() => toggleBottomTools(EXCEPTIONS)}
            active={bottomBlock === EXCEPTIONS}
            hasErrors={showExceptions}
            label={t('Exceptions')}
          />
        ) : null}
        <ControlButton
          popover={
            <div className="flex gap-2 items-center">
              <LaunchEventsShortcut />
              <div>{t('Launch Events')}</div>
            </div>
          }
          disabled={messagesLoading}
          onClick={() => toggleBottomTools(STACKEVENTS)}
          active={bottomBlock === STACKEVENTS}
          label="Events"
        />
        <ControlButton
          popover={
            <div className="flex gap-2 items-center">
              <LaunchPerformanceShortcut />
              <div>{t('Launch Performance')}</div>
            </div>
          }
          disabled={messagesLoading}
          onClick={() => toggleBottomTools(PERFORMANCE)}
          active={bottomBlock === PERFORMANCE}
          label={t('Performance')}
        />
      </>
    );
  },
);

const ControlPlayer = observer(Controls);

export default ControlPlayer;
