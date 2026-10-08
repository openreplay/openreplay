import { Chip } from '@/ui/data/Chip';
import { Loader } from '@/ui/feedback/Loader';
import { toast } from '@/ui/overlays/toast';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { createIOSPlayer } from 'Player';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IFRAME } from 'App/constants/storageKeys';
import { countDaysFrom } from 'App/date';
import { useStore } from 'App/mstore';
import { sessions as sessionsRoute, withSiteId } from 'App/routes';
import { useNavigate, useParams } from 'App/routing';
import PlayerErrorBoundary from 'Components/Session/Player/PlayerErrorBoundary';
import { wrapPlayerStore } from 'Components/Session/playerStore';

import PlayerBlock from './Player/MobilePlayer/PlayerBlock';
import ReplayActions from './ReplayScreen/ReplayActions';
import ReplayLead from './ReplayScreen/ReplayLead';
import { ReplayScreen } from './ReplayScreen/ReplayScreen';
import RightBlock from './RightBlock';
import {
  IOSPlayerContext,
  MobilePlayerContext,
  defaultContextValue,
} from './playerContext';

let playerInst: IOSPlayerContext['player'] | undefined;

function MobilePlayer(props: any) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionStore, uiPlayerStore, integrationsStore, projectsStore } =
    useStore();
  const session = sessionStore.current;
  const [activeTab, setActiveTab] = useState('');
  // @ts-ignore
  const [contextValue, setContextValue] =
    useState<IOSPlayerContext>(defaultContextValue);
  const params: { sessionId: string } = useParams();
  const { fullscreen, toggleFullscreen, closeBottomBlock } = uiPlayerStore;
  const hideBack = localStorage.getItem(IFRAME) === 'true';
  const [fullView, setFullView] = useState(false);

  const back = () => {
    const { sessionPath } = sessionStore;
    const list = withSiteId(sessionsRoute(), projectsStore.siteId!);
    if (
      !sessionPath?.pathname ||
      sessionPath.pathname === document.location.pathname ||
      sessionPath.pathname.includes('/session/')
    ) {
      navigate(list);
    } else {
      navigate(sessionPath.pathname + sessionPath.search);
    }
  };

  useEffect(() => {
    playerInst = undefined;
    if (!session.sessionId || contextValue.player !== undefined) return;
    void integrationsStore.issues.fetchIntegrations();
    sessionStore.setUserTimezone(session.timezone);
    const [IOSPlayerInst, PlayerStore] = createIOSPlayer(
      session,
      wrapPlayerStore,
      toast,
    );
    setContextValue({ player: IOSPlayerInst, store: PlayerStore });
    playerInst = IOSPlayerInst;
  }, [session.sessionId]);

  useEffect(() => {
    setFullView(
      new URLSearchParams(location.search).get('fullview') === 'true',
    );
  }, [session.sessionId]);

  const { messagesProcessed, error } = contextValue.store?.get() || {};

  React.useEffect(() => {
    if (
      (messagesProcessed && session.events.length > 0) ||
      session.errors.length > 0
    ) {
      contextValue.player?.updateLists?.(session);
    }
  }, [session.events, session.errors, contextValue.player, messagesProcessed]);

  React.useEffect(() => {
    if (activeTab === '' && messagesProcessed && contextValue.player) {
      const jumpToTime = props.query.get('jumpto');
      if (jumpToTime) {
        contextValue.player.jump(parseInt(jumpToTime));
      }
      contextValue.player.play();
    }
  }, [activeTab, messagesProcessed]);

  useEffect(
    () => () => {
      console.debug('cleaning up player after', params.sessionId);
      toggleFullscreen(false);
      closeBottomBlock();
      playerInst?.clean();
      // @ts-ignore
      setContextValue(defaultContextValue);
    },
    [params.sessionId],
  );

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
  const onPanel = (key: string | null) => {
    const next = key ?? '';
    if ((next === '') !== (activeTab === '') && contextValue.player) {
      if (next === '' || !showEvents) contextValue.player.toggleEvents();
    }
    setActiveTab(next);
  };

  const player = !contextValue.player ? (
    <Loader style={{ margin: 'auto' }} />
  ) : error ? (
    <NotReady startedAt={session.startedAt ?? 0} />
  ) : (
    <PlayerBlock
      activeTab={activeTab}
      setActiveTab={onPanel}
      fullView={fullView}
    />
  );

  return (
    <MobilePlayerContext.Provider value={contextValue}>
      <PlayerErrorBoundary>
        {fullView ? (
          player
        ) : (
          <ReplayScreen
            back={
              hideBack ? undefined : { label: t('Sessions'), onClick: back }
            }
            lead={<ReplayLead width={width} height={height} />}
            actions={
              <>
                <Chip kind="status" tone="success">
                  {session.platform === 'ios' ? 'iOS' : 'Android'} {t('beta')}
                </Chip>
                <ReplayActions activeTab={activeTab} setActiveTab={onPanel} />
              </>
            }
            panels={[{ key: 'EVENTS', label: t('Activity') }]}
            panel={activeTab || null}
            onPanel={onPanel}
            renderPanel={(key) => (
              <RightBlock activeTab={key} setActiveTab={onPanel} embedded />
            )}
            fullscreen={fullscreen}
          >
            {player}
          </ReplayScreen>
        )}
      </PlayerErrorBoundary>
    </MobilePlayerContext.Provider>
  );
}

function NotReady({ startedAt }: { startedAt: number }) {
  const { t } = useTranslation();
  const old = countDaysFrom(startedAt) > 2;
  return (
    <div className="m-player items-center justify-center text-center">
      <p className="text-lg">
        {old
          ? t('Session not found.')
          : t('This session is still being processed.')}
      </p>
      <p className="text-sm text-content-muted">
        {old
          ? t('Please check your data retention policy.')
          : t('Please check it again in a few minutes.')}
      </p>
    </div>
  );
}

export default withLocationHandlers()(observer(MobilePlayer));
