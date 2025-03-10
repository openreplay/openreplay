import React from 'react';
import cn from 'classnames';
import { useStore } from 'App/mstore';

import { CONSOLE } from 'App/mstore/uiPlayerStore';
import {
  PlayerContext,
  ILivePlayerContext,
} from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { useLocation } from 'react-router-dom';
import ControlButton from 'Components/Session_/Player/Controls/ControlButton';
import { SKIP_INTERVALS } from 'Components/Session_/Player/Controls/Controls';
import styles from 'Components/Session_/Player/Controls/controls.module.css';
import Timeline from './Timeline';
import AssistDuration from './AssistDuration';
import AssistSessionsTabs from './AssistSessionsTabs';
import LiveTag from './LiveTag';

function Controls(props: any) {
  const { uiPlayerStore, searchStoreLive, sessionStore } = useStore();
  const { toggleBottomBlock } = uiPlayerStore;
  const { bottomBlock } = uiPlayerStore;
  const { skipInterval } = uiPlayerStore;
  // @ts-ignore ?? TODO
  const { player, store } = React.useContext<ILivePlayerContext>(PlayerContext);
  const [noControls, setNoControls] = React.useState(false);
  const [noGrid, setNoGrid] = React.useState(false);
  const { search } = useLocation();

  const { jumpToLive } = player;
  const { livePlay, currentTab, tabStates } = store.get();

  const exceptionsList = tabStates[currentTab]?.exceptionsList || [];
  const logRedCount = tabStates[currentTab]?.logMarkedCountNow || 0;
  const showExceptions = exceptionsList.length > 0;
  const session = sessionStore.current;
  const fetchAssistSessions = sessionStore.fetchLiveSessions;
  const totalAssistSessions = sessionStore.totalLiveSessions;
  const closedLive = !!sessionStore.errorStack?.length || !sessionStore.current;

  const onKeyDown = (e: any) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    if (e.key === 'ArrowRight') {
      forthTenSeconds();
    }
    if (e.key === 'ArrowLeft') {
      backTenSeconds();
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', onKeyDown.bind(this));
    if (totalAssistSessions === 0) {
      fetchAssistSessions();
    }
    const queryParams = new URLSearchParams(search);
    if (queryParams.has('noFooter') && queryParams.get('noFooter') === 'true') {
      setNoControls(true);
    }

    if (queryParams.has('noGrid') && queryParams.get('noGrid') === 'true') {
      setNoGrid(true);
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

  const toggleBottomTools = (blockName: number) => {
    toggleBottomBlock(blockName);
  };

  return (
    <div className={styles.controls}>
      {session.liveOnly ? null : <Timeline />}
      {!noControls ? (
        <div
          className={cn(styles.buttons, '!px-5 !pt-0')}
          data-is-live
          style={{ height: noGrid ? '40px' : '' }}
        >
          <div className="flex items-center">
            {!closedLive && (
              <div className={styles.buttonsLeft}>
                <LiveTag
                  isLive={livePlay}
                  onClick={() => (livePlay ? null : jumpToLive())}
                />
                <div className="font-semibold px-2">
                  <AssistDuration />
                </div>
              </div>
            )}
          </div>

          {totalAssistSessions > 1 && !noGrid ? (
            <div>
              <AssistSessionsTabs session={session} />
            </div>
          ) : null}

          <div className="flex items-center h-full">
            <ControlButton
              onClick={() => toggleBottomTools(CONSOLE)}
              active={bottomBlock === CONSOLE}
              label="Console"
              hasErrors={logRedCount > 0 || showExceptions}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

const ControlPlayer = observer(Controls);

export default ControlPlayer;
