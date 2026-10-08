import { hasAi } from '@/utils/split-utils';
import { STORAGE_TYPES, StorageType, selectStorageType } from 'Player';
import { observer } from 'mobx-react-lite';
import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import {
  BACKENDLOGS,
  CONSOLE,
  GRAPHQL,
  LONG_TASK,
  NETWORK,
  OVERVIEW,
  PERFORMANCE,
  PROFILER,
  STACKEVENTS,
  STORAGE,
} from 'App/mstore/uiPlayerStore';
import { signalService } from 'App/services';
import DropdownAudioPlayer from 'Components/Session/Player/ReplayPlayer/AudioPlayer';
import SummaryButton from 'Components/Session_/Player/Controls/SummaryButton';

import { DevToolsFrame } from './DevToolsFrame';

const TRACE: Record<number, string> = {
  [OVERVIEW]: 'xray',
  [CONSOLE]: 'console',
  [NETWORK]: 'network',
  [PERFORMANCE]: 'performance',
  [GRAPHQL]: 'graphql',
  [STORAGE]: 'storage',
  [STACKEVENTS]: 'stack_events',
  [PROFILER]: 'profiler',
  [BACKENDLOGS]: 'backend_logs',
};

const storageName = (type: StorageType) =>
  ({
    [STORAGE_TYPES.REDUX]: 'Redux',
    [STORAGE_TYPES.MOBX]: 'MobX',
    [STORAGE_TYPES.VUEX]: 'Vuex',
    [STORAGE_TYPES.NGRX]: 'NgRx',
    [STORAGE_TYPES.ZUSTAND]: 'Zustand',
  })[type as string] ?? 'State';

interface Props {
  disabled: boolean;
  height: number;
  onHeight: (h: number) => void;
  /** The open panel's content. */
  children: ReactNode;
}

/** Chrome-style strip between the stage and the transport; its panel opens above. */
function DevTools({ disabled, height, onHeight, children }: Props) {
  const { t } = useTranslation();
  const { player, store } = React.useContext(PlayerContext);
  const {
    uiPlayerStore,
    sessionStore,
    integrationsStore,
    projectsStore,
    aiSummaryStore,
  } = useStore();
  const { bottomBlock, toggleBottomBlock } = uiPlayerStore;
  const showStorageHint = !uiPlayerStore.hiddenHints.storage;
  const { inspectorMode, currentTab, tabStates } = store.get();
  const tab = tabStates[currentTab];

  React.useEffect(() => {
    void integrationsStore.integrations.ensureIntegrations(
      projectsStore.activeSiteId,
    );
  }, [projectsStore.activeSiteId]);

  const storageType = tab ? selectStorageType(tab) : StorageType.NONE;
  const backends = integrationsStore.integrations.backendLogIntegrations;
  const audio = (sessionStore.current.stackEvents ?? []).filter((e: any) =>
    e.name?.includes('media/audio'),
  );
  const open = bottomBlock && !inspectorMode ? bottomBlock : 0;

  const toggle = (block: number) => {
    player.toggleInspectorMode(false);
    toggleBottomBlock(block);
    signalService.send(
      { source: TRACE[block] ?? 'unknown' },
      sessionStore.current.sessionId,
    );
  };

  const tabs: {
    block: number;
    label: string;
    hint?: string;
    errors?: boolean;
    show?: boolean;
    always?: boolean;
  }[] = [
    {
      block: OVERVIEW,
      label: 'X-Ray',
      hint: t('Get a quick overview on the issues in this session.'),
      always: true,
    },
    {
      block: CONSOLE,
      label: t('Console'),
      hint: t('What the page logged'),
      errors:
        (tab?.logMarkedCountNow ?? 0) > 0 ||
        (tab?.exceptionsList?.length ?? 0) > 0,
    },
    {
      block: NETWORK,
      label: t('Network'),
      hint: t('Every request the page made'),
      errors: (tab?.resourceMarkedCountNow ?? 0) > 0,
    },
    {
      block: PERFORMANCE,
      label: t('Performance'),
      hint: t('FPS, CPU, memory and DOM size over time'),
    },
    {
      block: GRAPHQL,
      label: 'GraphQL',
      show: (tab?.graphqlList?.length ?? 0) > 0,
    },
    {
      block: STORAGE,
      label: storageName(storageType),
      hint: t('The application store, if the tracker found one'),
      show: storageType !== STORAGE_TYPES.NONE || showStorageHint,
    },
    {
      block: STACKEVENTS,
      label: t('Events'),
      hint: t('Custom events and integration events'),
      errors: (tab?.stackMarkedCountNow ?? 0) > 0,
    },
    {
      block: LONG_TASK,
      label: t('Long Tasks'),
      show: (tab?.laTaskList?.length ?? 0) > 0,
    },
    {
      block: PROFILER,
      label: t('Profiler'),
      show: (tab?.profilesList?.length ?? 0) > 0,
    },
    {
      block: BACKENDLOGS,
      label: t('Traces'),
      hint: backends.map((s: any) => s.name).join(', '),
      show: backends.length > 0,
    },
  ];

  const showSummary = () => {
    player.pause();
    if (bottomBlock !== OVERVIEW) toggle(OVERVIEW);
    aiSummaryStore.setToggleSummary(!aiSummaryStore.toggleSummary);
  };

  return (
    <DevToolsFrame
      tabs={tabs
        .filter((x) => x.show !== false)
        .map((x) => ({ ...x, key: x.block }))}
      open={open}
      onToggle={toggle}
      height={height}
      onHeight={(h) => {
        onHeight(h);
        player.scale();
      }}
      disabled={disabled}
      extras={
        <>
          {hasAi ? <SummaryButton onClick={showSummary} /> : null}
          {audio.length ? (
            <DropdownAudioPlayer audioEvents={audio as any} />
          ) : null}
        </>
      }
    >
      {children}
    </DevToolsFrame>
  );
}

export default observer(DevTools);
