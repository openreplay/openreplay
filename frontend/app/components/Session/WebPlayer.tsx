import { Loader } from '@/ui/feedback/Loader';
import { toast } from '@/ui/overlays/toast';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { createWebPlayer } from 'Player';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IFRAME } from 'App/constants/storageKeys';
import { useStore } from 'App/mstore';
import { sessions as sessionsRoute, withSiteId } from 'App/routes';
import { useNavigate, useParams } from 'App/routing';
import { signalService } from 'App/services';
import { wrapPlayerStore } from 'Components/Session/playerStore';

import PlayerContent from './Player/ReplayPlayer/PlayerContent';
import ReplayActions from './ReplayScreen/ReplayActions';
import ReplayLead from './ReplayScreen/ReplayLead';
import { ReplayScreen } from './ReplayScreen/ReplayScreen';
import RightBlock from './RightBlock';
import {
  IPlayerContext,
  PlayerContext,
  defaultContextValue,
} from './playerContext';

let playerInst: IPlayerContext['player'] | undefined;

const hasEvents = (filters: { isEvent?: boolean }[] = []) => {
  return filters.some((filter) => filter.isEvent);
};

function WebPlayer(props: any) {
  const {
    sessionStore,
    uiPlayerStore,
    integrationsStore,
    searchStore,
    projectsStore,
  } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hideBack = localStorage.getItem(IFRAME) === 'true';
  const back = () => {
    const { sessionPath } = sessionStore;
    const list = withSiteId(sessionsRoute(), projectsStore.siteId!);
    if (
      !sessionPath?.pathname ||
      sessionPath.pathname === document.location.pathname ||
      sessionPath.pathname.includes('/session/') ||
      sessionPath.pathname.includes('/assist/')
    ) {
      navigate(list);
    } else {
      navigate(sessionPath.pathname + sessionPath.search);
    }
  };
  const devTools = sessionStore.devTools;
  const session = sessionStore.current;
  const { prefetched } = sessionStore;
  const startedAt = sessionStore.current.startedAt || 0;
  const duration = sessionStore.current.durationMs ?? 0;
  const { fullscreen } = uiPlayerStore;
  const { toggleFullscreen } = uiPlayerStore;
  const { closeBottomBlock } = uiPlayerStore;
  const [activeTab, setActiveTab] = useState('');
  const [visuallyAdjusted, setAdjusted] = useState(false);
  const [windowActive, setWindowActive] = useState(!document.hidden);
  // @ts-ignore
  const [contextValue, setContextValue] =
    useState<IPlayerContext>(defaultContextValue);
  const params: { sessionId: string } = useParams();
  const [fullView, setFullView] = useState(false);
  const openedAt = React.useRef<number>(null);

  React.useEffect(() => {
    if (
      searchStore.instance.filters?.length &&
      hasEvents(searchStore.instance.filters)
    ) {
      uiPlayerStore.setSearchEventsSwitchButton(true);
      uiPlayerStore.setShowOnlySearchEvents(true);
    } else {
      uiPlayerStore.setSearchEventsSwitchButton(false);
      uiPlayerStore.setShowOnlySearchEvents(false);
    }
  }, [searchStore.instance.filters]);

  React.useEffect(() => {
    openedAt.current = Date.now();
    const handleActivation = () => {
      if (!document.hidden) {
        setWindowActive(true);
        document.removeEventListener('visibilitychange', handleActivation);
      }
    };
    document.addEventListener('visibilitychange', handleActivation);

    return () => {
      const durWatching = Date.now() - (openedAt.current || performance.now());
      signalService.send(
        {
          source: 'duration',
          value: durWatching,
        },
        session.sessionId,
      );
      devTools.update('network', { activeTab: 'ALL' });
      document.removeEventListener('visibilitychange', handleActivation);
    };
  }, []);

  useEffect(() => {
    if (session.sessionId) {
      sessionStore.setLastPlayedSessionId(session.sessionId);
    }
    playerInst = undefined;
    if (!session.sessionId || contextValue.player !== undefined) return;
    const mobData = sessionStore.prefetchedMobUrls[session.sessionId] as
      | Record<string, any>
      | undefined;
    const usePrefetched = prefetched && mobData?.data;
    void integrationsStore.issues.fetchIntegrations();
    sessionStore.setUserTimezone(session.timezone);
    const [WebPlayerInst, PlayerStore] = createWebPlayer(
      session,
      wrapPlayerStore,
      toast,
      prefetched,
    );
    if (usePrefetched) {
      if (mobData?.data) {
        WebPlayerInst.preloadFirstFile(mobData?.data, mobData?.fileKey);
      }
    }
    setContextValue({ player: WebPlayerInst, store: PlayerStore });
    playerInst = WebPlayerInst;

    const freeze = props.query.get('freeze');
    if (freeze) {
      void WebPlayerInst.freeze();
    }
    signalService.send(
      {
        source: 'replay',
      },
      session.sessionId,
    );
  }, [session.sessionId]);

  const domFiles = session?.domURL?.length ?? 0;
  useEffect(() => {
    if (!prefetched && domFiles > 0) {
      playerInst?.reinit(session);
    }
  }, [session, domFiles, prefetched]);

  const {
    firstVisualEvent: visualOffset,
    messagesProcessed,
    tabStates,
    ready,
  } = contextValue.store?.get() || {};
  const cssLoading =
    ready && tabStates
      ? Object.values(tabStates).some(({ cssLoading }) => cssLoading)
      : true;

  React.useEffect(() => {
    if (
      messagesProcessed &&
      (session.events?.length ||
        session.errors?.length ||
        session.stackEvents?.length ||
        session.addedEvents)
    ) {
      contextValue.player?.updateLists?.(session);
    }
  }, [
    session.events,
    session.errors,
    session.addedEvents,
    contextValue.player,
    messagesProcessed,
  ]);

  React.useEffect(() => {
    if (activeTab === '' && contextValue.player && windowActive) {
      const jumpToTime = props.query.get('jumpto');
      const shouldAdjustOffset = visualOffset !== 0 && !visuallyAdjusted;

      if (jumpToTime || shouldAdjustOffset) {
        if (jumpToTime && jumpToTime > visualOffset) {
          const diff =
            jumpToTime > duration ? jumpToTime - startedAt : jumpToTime;
          contextValue.player.jump(Math.max(diff, 0));
          setAdjusted(true);
        } else {
          contextValue.player.jump(visualOffset);
          setAdjusted(true);
        }
      }
    }
  }, [activeTab, visualOffset, windowActive]);

  useEffect(() => {
    if (cssLoading) {
      contextValue.player?.pause();
    } else if (ready) {
      contextValue.player?.play();
    }
  }, [cssLoading, ready]);

  React.useEffect(() => {
    if (activeTab === 'Click map') {
      contextValue.player?.pause();
    }
  }, [activeTab]);

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(
    () => () => {
      console.debug('cleaning up player after', params.sessionId);
      toggleFullscreen(false);
      closeBottomBlock();

      // Pause immediately (stops animation loop), but defer the heavy
      // teardown (iframe removal, store resets) so it doesn't block
      // React from mounting the next page.
      playerInst?.pause();
      const inst = playerInst;
      if (inst) {
        setTimeout(() => inst.clean(), 0);
      }
      // @ts-ignore
      setContextValue(defaultContextValue);
    },
    [params.sessionId],
  );

  useEffect(() => {
    const isFullView = new URLSearchParams(location.search).get('fullview');
    setFullView(isFullView === 'true');
  }, [session.sessionId]);

  if (!session.sessionId) {
    return (
      <Loader
        size={75}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          height: 75,
        }}
      />
    );
  }

  const {
    width = 0,
    height = 0,
    showEvents = false,
  } = contextValue.store?.get() || {};
  const panels = [
    { key: 'EVENTS', label: t('Activity') },
    { key: 'CLICKMAP', label: t('Click map') },
    { key: 'INSPECTOR', label: t('Features') },
  ];
  const onPanel = (key: string | null) => {
    const next = key ?? '';
    if ((next === '') !== (activeTab === '') && contextValue.player) {
      if (next === '' || !showEvents) contextValue.player.toggleEvents();
    }
    setActiveTab(next);
  };

  const player = contextValue.player ? (
    <PlayerContent
      activeTab={activeTab}
      fullscreen={fullscreen}
      setActiveTab={setActiveTab}
      session={session}
      fillHeight
      noSidePanel={!fullView}
    />
  ) : (
    <Loader style={{ margin: 'auto' }} />
  );

  return (
    <PlayerContext.Provider value={contextValue}>
      {fullView ? (
        player
      ) : (
        <ReplayScreen
          back={hideBack ? undefined : { label: t('Sessions'), onClick: back }}
          lead={<ReplayLead width={width} height={height} />}
          actions={
            <ReplayActions activeTab={activeTab} setActiveTab={onPanel} />
          }
          panels={panels}
          panel={activeTab || null}
          onPanel={onPanel}
          panelWidth={activeTab === 'EXPORT' ? 480 : undefined}
          renderPanel={(key) => (
            <RightBlock activeTab={key} setActiveTab={onPanel} embedded />
          )}
          fullscreen={fullscreen}
        >
          {player}
        </ReplayScreen>
      )}
    </PlayerContext.Provider>
  );
}

export default withLocationHandlers()(observer(WebPlayer));
