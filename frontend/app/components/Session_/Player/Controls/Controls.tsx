import { IconButton } from '@/ui/actions/IconButton';
import cn from 'classnames';
import {
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { PlayingState } from 'App/player-ui';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { signalService } from 'App/services';
import { mobileScreen } from 'App/utils/isMobile';
import useShortcuts from 'Components/Session/Player/ReplayPlayer/useShortcuts';
import PlaybackSettings, {
  SKIP_INTERVALS,
} from 'Components/Session/ReplayScreen/PlaybackSettings';
import { ReduxTime } from 'Components/Session_/Player/Controls/Time';

import Timeline from './Timeline';
import PlayingTime from './components/PlayingTime';
import { type ITimeMode } from './components/timeMode';

export { SKIP_INTERVALS };

function Controls({ setActiveTab, fullView, mobile }: any) {
  const { t } = useTranslation();
  const [timeMode, setTimeMode] = React.useState<ITimeMode>(
    localStorage.getItem('__or_player_time_mode') as ITimeMode,
  );
  const saveTimeMode = (mode: ITimeMode) => {
    localStorage.setItem('__or_player_time_mode', mode);
    setTimeMode(mode);
  };
  const { player, store } = React.useContext(PlayerContext);
  const { uiPlayerStore, projectsStore, sessionStore, userStore } = useStore();
  const [mounted, setMounted] = React.useState(false);
  const permissions = userStore.account.permissions || [];
  const disableDevtools =
    userStore.isEnterprise &&
    !(
      permissions.includes('DEV_TOOLS') ||
      permissions.includes('SERVICE_DEV_TOOLS')
    );
  const { fullscreen } = uiPlayerStore;
  const { toggleBottomBlock } = uiPlayerStore;
  const { fullscreenOn } = uiPlayerStore;
  const { fullscreenOff } = uiPlayerStore;
  const { skipInterval } = uiPlayerStore;
  const history = useHistory();
  const { siteId } = projectsStore;
  const {
    playing,
    completed,
    speed,
    messagesLoading,
    markedTargets,
    inspectorMode,
  } = store.get();

  const session = sessionStore.current;
  const previousSessionId = sessionStore.previousId;
  const nextSessionId = sessionStore.nextId;

  const disabled =
    disableDevtools || messagesLoading || inspectorMode || markedTargets;
  const sessionTz = session?.timezone;
  const sessionId = session?.sessionId;

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

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      signalService.send(
        {
          source: 'speed',
          value: speed,
        },
        sessionId,
      );
    }
  }, [speed]);

  const togglePlay = () => {
    player.togglePlay();
    signalService.send(
      {
        source: playing ? 'pause' : 'play',
      },
      sessionId,
    );
  };

  const state = completed
    ? PlayingState.Completed
    : playing
      ? PlayingState.Playing
      : PlayingState.Paused;

  const highlightTimer = React.useMemo(
    () => new URLSearchParams(window.location.search).get('timer'),
    [],
  );

  if (fullView) {
    return (
      <div
        className={cn(
          'absolute bottom-1 left-1 z-50 flex items-center font-semibold',
          highlightTimer
            ? 'p-1 rounded-lg border-2 border-black bg-red text-white'
            : '',
        )}
        data-test-id="timer"
      >
        <ReduxTime isCustom name="time" format="mm:ss" />
        <span className="px-1">/</span>
        <ReduxTime isCustom name="endTime" format="mm:ss" />
      </div>
    );
  }

  return (
    <div className="m-tl">
      <IconButton
        icon={
          state === PlayingState.Playing ? (
            <Pause size={15} />
          ) : state === PlayingState.Completed ? (
            <RotateCcw size={15} />
          ) : (
            <Play size={15} />
          )
        }
        label={
          state === PlayingState.Playing
            ? t('Pause (Space)')
            : t('Play (Space)')
        }
        variant="ghost"
        onClick={togglePlay}
      />
      <IconButton
        icon={<ChevronsLeft size={15} />}
        label={t('Back {{n}}s (←)', { n: skipInterval })}
        variant="ghost"
        onClick={() => player.jumpInterval(-SKIP_INTERVALS[skipInterval])}
      />
      <IconButton
        icon={<ChevronsRight size={15} />}
        label={t('Forward {{n}}s (→)', { n: skipInterval })}
        variant="ghost"
        onClick={() => player.jumpInterval(SKIP_INTERVALS[skipInterval])}
      />
      {!mobileScreen && (
        <span className="m-tl__clock m-mono">
          <PlayingTime
            timeMode={timeMode}
            setTimeMode={saveTimeMode}
            startedAt={session.startedAt}
            sessionTz={sessionTz}
          />
        </span>
      )}
      <Timeline inline isMobile={mobile} />
      {!mobileScreen && (
        <PlaybackSettings disabled={disabled} mobile={mobile} />
      )}
      <IconButton
        icon={fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        label={fullscreen ? t('Exit full screen') : t('Full screen')}
        variant="ghost"
        onClick={fullscreen ? fullscreenOff : fullscreenOn}
      />
    </div>
  );
}

export default observer(Controls);
