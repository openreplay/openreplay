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
  LaunchXRaShortcut,
} from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import { signalService } from 'App/services';
import {
  CONSOLE,
  GRAPHQL,
  NETWORK,
  OVERVIEW,
  PERFORMANCE,
  PROFILER,
  STACKEVENTS,
  STORAGE,
  BACKENDLOGS,
  LONG_TASK,
} from 'App/mstore/uiPlayerStore';
import { Icon } from 'UI';
import LogsButton from 'App/components/Session/Player/SharedComponents/BackendLogs/LogsButton';
import {
  CodeOutlined,
  DashboardOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import { ArrowDownUp, ListCollapse, Merge, Timer } from 'lucide-react';
import { ReduxTime } from 'Components/Session_/Player/Controls/Time';

import ControlButton from './ControlButton';
import Timeline from './Timeline';
import PlayerControls from './components/PlayerControls';
import styles from './controls.module.css';
import { useTranslation } from 'react-i18next';
import { mobileScreen } from 'App/utils/isMobile';
import { hasAi } from '@/utils/split-utils';

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
      return {
        name: 'Redux',
        icon: <Icon name="integrations/redux" size={14} />,
      };
    case STORAGE_TYPES.MOBX:
      return {
        name: 'Mobx',
        icon: <Icon name="integrations/mobx" size={14} />,
      };
    case STORAGE_TYPES.VUEX:
      return {
        name: 'Vuex',
        icon: <Icon name="integrations/vuejs" size={14} />,
      };
    case STORAGE_TYPES.NGRX:
      return {
        name: 'NgRx',
        icon: <Icon name="integrations/ngrx" size={14} />,
      };
    case STORAGE_TYPES.ZUSTAND:
      return {
        name: 'Zustand',
        icon: <Icon name="integrations/zustand" size={14} />,
      };
    case STORAGE_TYPES.NONE:
      return { name: 'State', icon: <ClusterOutlined size={14} /> };
    default:
      return { name: 'State', icon: <ClusterOutlined size={14} /> };
  }
}

function Controls({ setActiveTab, activeTab, fullView }: any) {
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
  const { bottomBlock } = uiPlayerStore;
  const { toggleBottomBlock } = uiPlayerStore;
  const { fullscreenOn } = uiPlayerStore;
  const { fullscreenOff } = uiPlayerStore;
  const { toggleScrollMode } = uiPlayerStore;
  const { changeSkipInterval } = uiPlayerStore;
  const { skipInterval } = uiPlayerStore;
  const showStorageRedux = !uiPlayerStore.hiddenHints.storage;
  const history = useHistory();
  const { siteId } = projectsStore;
  const {
    playing,
    completed,
    skip,
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
    toggleScrollMode,
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

  const forthTenSeconds = () => {
    // @ts-ignore
    player.jumpInterval(SKIP_INTERVALS[skipInterval]);
    signalService.send(
      {
        source: 'fast_forward',
      },
      sessionId,
    );
  };

  const backTenSeconds = () => {
    // @ts-ignore
    player.jumpInterval(-SKIP_INTERVALS[skipInterval]);
    signalService.send(
      {
        source: 'rewind',
      },
      sessionId,
    );
  };

  const toggleBottomTools = (blockName: number) => {
    player.toggleInspectorMode(false);
    toggleBottomBlock(blockName);
    signalService.send(
      {
        source: getTraceName(blockName),
      },
      sessionId,
    );
  };

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

  const events = session.stackEvents ?? [];
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
    <div className={styles.controls}>
      <Timeline />
      {!fullscreen && !mobileScreen && (
        <div className={cn(styles.buttons, 'px-2!')}>
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
                  togglePlay={togglePlay}
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
            <DevtoolsButtons
              showStorageRedux={showStorageRedux}
              toggleBottomTools={toggleBottomTools}
              bottomBlock={bottomBlock}
              disabled={disabled}
              events={events}
              activeTab={activeTab}
            />

            <FullScreenButton
              size={16}
              onClick={fullscreenOn}
              customClasses="rounded hover:bg-gray-light-shade color-gray-medium"
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
  activeTab?: string;
}

const DevtoolsButtons = observer(
  ({
    showStorageRedux,
    toggleBottomTools,
    bottomBlock,
    disabled,
    events,
    activeTab,
  }: IDevtoolsButtons) => {
    const { t } = useTranslation();
    const { aiSummaryStore, integrationsStore } = useStore();
    const { store, player } = React.useContext(PlayerContext);
    const { inspectorMode, currentTab, tabStates } = store.get();

    const disableButtons = disabled;

    const profilesList = tabStates[currentTab]?.profilesList || [];
    const graphqlList = tabStates[currentTab]?.graphqlList || [];
    const logRedCount = tabStates[currentTab]?.logMarkedCountNow || 0;
    const resourceRedCount = tabStates[currentTab]?.resourceMarkedCountNow || 0;
    const stackRedCount = tabStates[currentTab]?.stackMarkedCountNow || 0;
    const exceptionsList = tabStates[currentTab]?.exceptionsList || [];
    const ltList = tabStates[currentTab]?.laTaskList || [];

    const storageType = store.get().tabStates[currentTab]
      ? selectStorageType(store.get().tabStates[currentTab])
      : StorageType.NONE;
    const profilesCount = profilesList.length;
    const graphqlCount = graphqlList.length;
    const showGraphql = graphqlCount > 0;
    const showProfiler = profilesCount > 0;
    const showExceptions = exceptionsList.length > 0;
    const showStorage = storageType !== STORAGE_TYPES.NONE || showStorageRedux;
    const showLongTask = ltList.length;

    const showSummary = () => {
      player.pause();
      if (bottomBlock !== OVERVIEW) {
        toggleBottomTools(OVERVIEW);
      }
      aiSummaryStore.setToggleSummary(!aiSummaryStore.toggleSummary);
    };

    const possibleAudio = events.filter((e) => e.name?.includes('media/audio'));
    const integratedServices =
      integrationsStore.integrations.backendLogIntegrations;

    const showIcons = activeTab === 'EXPORT';
    const labels = {
      console: {
        icon: <CodeOutlined size={14} />,
        label: t('Console'),
      },
      performance: {
        icon: <DashboardOutlined size={14} />,
        label: t('Performance'),
      },
      network: {
        icon: <ArrowDownUp size={14} strokeWidth={2} />,
        label: t('Network'),
      },
      events: {
        icon: <ListCollapse size={14} strokeWidth={2} />,
        label: t('Events'),
      },
      state: {
        icon: getStorageName(storageType).icon,
        label: getStorageName(storageType).name,
      },
      graphql: {
        icon: <Merge size={14} strokeWidth={2} />,
        label: 'Graphql',
      },
      longTask: {
        icon: <Timer size={14} strokeWidth={2} />,
        label: t('Long Tasks'),
      },
    };
    // @ts-ignore
    const getLabel = (block: string) =>
      labels[block][showIcons ? 'icon' : 'label'];
    return (
      <>
        {hasAi ? <SummaryButton onClick={showSummary} /> : undefined}
        <ControlButton
          popover={
            <div className="flex items-center gap-2">
              <LaunchXRaShortcut />
              <div>
                {t('Get a quick overview on the issues in this session.')}
              </div>
            </div>
          }
          customKey="xray"
          label="X-Ray"
          onClick={() => toggleBottomTools(OVERVIEW)}
          active={bottomBlock === OVERVIEW && !inspectorMode}
        />

        <ControlButton
          popover={
            <div className="flex gap-2 items-center">
              <LaunchConsoleShortcut />
              <div>{t('Launch Console')}</div>
            </div>
          }
          customKey="console"
          disabled={disableButtons}
          onClick={() => toggleBottomTools(CONSOLE)}
          active={bottomBlock === CONSOLE && !inspectorMode}
          label={getLabel('console')}
          hasErrors={logRedCount > 0 || showExceptions}
        />

        <ControlButton
          popover={
            <div className="flex gap-2 items-center">
              <LaunchNetworkShortcut />
              <div>{t('Launch Network')}</div>
            </div>
          }
          customKey="network"
          disabled={disableButtons}
          onClick={() => toggleBottomTools(NETWORK)}
          active={bottomBlock === NETWORK && !inspectorMode}
          label={getLabel('network')}
          hasErrors={resourceRedCount > 0}
        />

        <ControlButton
          popover={
            <div className="flex gap-2 items-center">
              <LaunchPerformanceShortcut />
              <div>{t('Launch Performance')}</div>
            </div>
          }
          customKey="performance"
          disabled={disableButtons}
          onClick={() => toggleBottomTools(PERFORMANCE)}
          active={bottomBlock === PERFORMANCE && !inspectorMode}
          label={getLabel('performance')}
        />

        {showGraphql && (
          <ControlButton
            disabled={disableButtons}
            onClick={() => toggleBottomTools(GRAPHQL)}
            active={bottomBlock === GRAPHQL && !inspectorMode}
            label={getLabel('graphql')}
            customKey="graphql"
          />
        )}

        {showStorage && (
          <ControlButton
            popover={
              <div className="flex gap-2 items-center">
                <LaunchStateShortcut />
                <div>{t('Launch State')}</div>
              </div>
            }
            customKey="state"
            disabled={disableButtons}
            onClick={() => toggleBottomTools(STORAGE)}
            active={bottomBlock === STORAGE && !inspectorMode}
            label={getLabel('state')}
          />
        )}
        <ControlButton
          popover={
            <div className="flex gap-2 items-center">
              <LaunchEventsShortcut />
              <div>{t('Launch Events')}</div>
            </div>
          }
          customKey="events"
          disabled={disableButtons}
          onClick={() => toggleBottomTools(STACKEVENTS)}
          active={bottomBlock === STACKEVENTS && !inspectorMode}
          label={getLabel('events')}
          hasErrors={stackRedCount > 0}
        />
        {showLongTask ? (
          <ControlButton
            customKey="longTask"
            disabled={disableButtons}
            onClick={() => toggleBottomTools(LONG_TASK)}
            active={bottomBlock === LONG_TASK && !inspectorMode}
            label={getLabel('longTask')}
          />
        ) : null}
        {showProfiler && (
          <ControlButton
            customKey="profiler"
            disabled={disableButtons}
            onClick={() => toggleBottomTools(PROFILER)}
            active={bottomBlock === PROFILER && !inspectorMode}
            label={t('Profiler')}
          />
        )}
        {integratedServices.length ? (
          <LogsButton
            integrated={integratedServices.map((service) => service.name)}
            onClick={() => toggleBottomTools(BACKENDLOGS)}
            shorten={showIcons}
          />
        ) : null}
        {possibleAudio.length ? (
          <DropdownAudioPlayer audioEvents={possibleAudio} />
        ) : null}
      </>
    );
  },
);

export function SummaryButton({
  onClick,
  withToggle,
  onToggle,
  toggleValue,
}: {
  onClick?: () => void;
  withToggle?: boolean;
  onToggle?: () => void;
  toggleValue?: boolean;
}) {
  const { t } = useTranslation();
  const [isHovered, setHovered] = React.useState(false);

  return (
    <div style={gradientButton} onClick={onClick}>
      <div
        style={isHovered ? onHoverFillStyle : fillStyle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {withToggle ? (
          <Switch size="small" checked={toggleValue} onChange={onToggle} />
        ) : null}
        <Icon name="sparkles" size={16} />
        <div className="font-semibold text-main">{t('Summary AI')}</div>
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
  justifyContent: 'center',
};
export const onHoverFillStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  borderRadius: '60px',
  gap: 2,
  alignItems: 'center',
  padding: '1px 8px',
  background: 'linear-gradient(156deg, #E3E6FF 0%, #E4F3F4 69.48%)',
};
export const fillStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  borderRadius: '60px',
  gap: 2,
  alignItems: 'center',
  padding: '1px 8px',
};

function getBlockLabel(blockName: number): string {
  switch (blockName) {
    case OVERVIEW:
      return 'Overview';
    case CONSOLE:
      return 'Console';
    case NETWORK:
      return 'Network';
    case PERFORMANCE:
      return 'Performance';
    case GRAPHQL:
      return 'GraphQL';
    case STORAGE:
      return 'State';
    case STACKEVENTS:
      return 'Events';
    case PROFILER:
      return 'Profiler';
    case BACKENDLOGS:
      return 'Backend Logs';
    default:
      return 'Unknown';
  }
}

function getTraceName(blockName: number): string {
  switch (blockName) {
    case OVERVIEW:
      return 'xray';
    case CONSOLE:
      return 'console';
    case NETWORK:
      return 'network';
    case PERFORMANCE:
      return 'performance';
    case GRAPHQL:
      return 'graphql';
    case STORAGE:
      return 'storage';
    case STACKEVENTS:
      return 'stack_events';
    case PROFILER:
      return 'profiler';
    case BACKENDLOGS:
      return 'backend_logs';
    default:
      return 'unknown';
  }
}

export default observer(Controls);
