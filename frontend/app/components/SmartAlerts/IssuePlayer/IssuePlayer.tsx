import { createWebPlayer } from 'Player';
import { ConfigProvider } from 'antd';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { toast } from 'react-toastify';

import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import {
  smartIssueDetails,
  smartIssueSession,
  smartIssues,
  withSiteId,
} from 'App/saasComponents';
import PlayerContent from 'Components/Session/Player/ReplayPlayer/PlayerContent';
import {
  type IPlayerContext,
  PlayerContext,
  defaultContextValue,
} from 'Components/Session/playerContext';
import { Loader } from 'UI';

import IssuePanel from './IssuePanel';
import IssuePlayerHeader from './IssuePlayerHeader';

const TOP_Z = 2147483000;

type View = 'activity' | 'issue' | 'highlight' | null;

/* Minimal-UI session replay for an issue: the real web player (PlayerContent +
   its real Console/Network/Activity), wrapped in a stripped-down header and our
   own Issue context panel. The player bootstrap mirrors WebPlayer.tsx. */
function IssuePlayer() {
  const { sessionStore, issuesStore, projectsStore, integrationsStore } =
    useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const params = useParams<{ issueId: string; sessionId: string }>();
  const slug = params.issueId ?? '';
  const sessionId = params.sessionId ?? '';

  const session = sessionStore.current;
  const { prefetched } = sessionStore;
  // default value is a partial context, filled in once the player loads
  const [contextValue, setContextValue] = React.useState<IPlayerContext>(
    defaultContextValue as any,
  );
  const playerRef = React.useRef<IPlayerContext['player'] | undefined>(
    undefined,
  );
  const adjustedRef = React.useRef(false);
  const [view, setView] = React.useState<View>('issue');

  const issue = issuesStore.bySlug(slug);
  const realId = issue?.id ?? '';
  const sessions = issuesStore.exampleSessions(realId);
  const card = sessions.find((c) => c.sessionId === sessionId);

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);

  React.useEffect(() => {
    if (realId) void issuesStore.loadSessions(realId);
  }, [realId]);

  React.useEffect(() => {
    if (sessionId) void sessionStore.fetchSessionData(sessionId);
    return () => sessionStore.clearCurrentSession();
  }, [sessionId]);

  // build the real web player once the session has loaded
  React.useEffect(() => {
    if (!session.sessionId || contextValue.player !== undefined) return;
    void integrationsStore.issues.fetchIntegrations();
    sessionStore.setUserTimezone(session.timezone as string);
    const mobData = sessionStore.prefetchedMobUrls?.[session.sessionId] as
      | Record<string, any>
      | undefined;
    const [inst, store] = createWebPlayer(
      session as any,
      (state) => makeAutoObservable(state),
      toast,
      prefetched,
    );
    if (prefetched && mobData?.data) {
      inst.preloadFirstFile(mobData.data, mobData.fileKey);
    }
    playerRef.current = inst;
    // syncs the created player (an external system) into context — same
    // bootstrap pattern as WebPlayer.tsx
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContextValue({ player: inst, store });
  }, [session.sessionId]);

  const domFiles = session?.domURL?.length ?? 0;
  React.useEffect(() => {
    if (!prefetched && domFiles > 0) playerRef.current?.reinit(session as any);
  }, [session, domFiles, prefetched]);

  const {
    firstVisualEvent: visualOffset = 0,
    messagesProcessed,
    tabStates,
    ready,
  } = contextValue.store?.get() || {};
  const cssLoading =
    ready && tabStates
      ? Object.values(tabStates).some((s: any) => s.cssLoading)
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
    if (cssLoading) contextValue.player?.pause();
    else if (ready) contextValue.player?.play();
  }, [cssLoading, ready]);

  // seek to the moment the issue was detected (jumpto query or issueTimestamp)
  React.useEffect(() => {
    if (!contextValue.player || adjustedRef.current) return;
    const jumpParam =
      Number(new URLSearchParams(location.search).get('jumpto')) ||
      card?.issueTimestamp ||
      0;
    if (jumpParam && jumpParam > visualOffset) {
      const dur = session.durationMs ?? 0;
      const diff =
        jumpParam > dur ? jumpParam - (session.startedAt || 0) : jumpParam;
      contextValue.player.jump(Math.max(diff, 0));
      adjustedRef.current = true;
    } else if (visualOffset !== 0) {
      contextValue.player.jump(visualOffset);
      adjustedRef.current = true;
    }
  }, [contextValue.player, visualOffset, card?.issueTimestamp]);

  // mark the issue moment on the shared player timeline (ms from session start)
  React.useEffect(() => {
    const ts = card?.issueTimestamp;
    if (!session.sessionId || !ts) {
      sessionStore.setTimelineIssues([]);
      return;
    }
    const dur = session.durationMs ?? 0;
    const rel = dur && ts > dur ? ts - (session.startedAt || 0) : ts;
    sessionStore.setTimelineIssues([
      { time: Math.max(rel, 0), label: issue ? `Issue: ${issue.head}` : undefined },
    ]);
  }, [session.sessionId, session.durationMs, card?.issueTimestamp, issue?.head]);

  React.useEffect(
    () => () => {
      const inst = playerRef.current;
      inst?.pause();
      if (inst) setTimeout(() => inst.clean(), 0);
      playerRef.current = undefined;
      // @ts-ignore
      setContextValue(defaultContextValue);
    },
    [sessionId],
  );

  const sessIdx = sessions.findIndex((c) => c.sessionId === sessionId);
  const prevId = sessIdx > 0 ? sessions[sessIdx - 1].sessionId : null;
  const nextId =
    sessIdx >= 0 && sessIdx < sessions.length - 1
      ? sessions[sessIdx + 1].sessionId
      : null;
  const goSession = (sid: string) =>
    history.push(withSiteId(smartIssueSession(slug, sid), siteId));
  const back = () =>
    history.push(
      withSiteId(issue ? smartIssueDetails(slug) : smartIssues(), siteId),
    );
  const onSetCritical = (val: boolean, reason?: string) => {
    if (issue) issuesStore.setCritical(issue.id, val, reason);
  };

  const playerActiveTab =
    view === 'activity' ? 'EVENTS' : view === 'highlight' ? 'HIGHLIGHT' : '';
  const setPlayerActiveTab = (tab: string) => {
    if (tab === 'EVENTS') setView('activity');
    else if (tab === 'HIGHLIGHT') setView('highlight');
    else if (tab === '') setView(null);
  };

  const email = card?.email ?? session.userId ?? 'Anonymous';
  const browser = card?.browser ?? session.userBrowser ?? '';
  const os = card?.os ?? session.userOs ?? '';
  const device = card?.device ?? session.userDeviceType ?? 'desktop';
  const countryCode = card?.country ?? session.userCountry ?? '';
  const city = card?.city ?? session.userCity ?? '';
  const date =
    card?.date ??
    (session.startedAt
      ? new Date(session.startedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '');
  const variation = card?.variation || card?.journey || issue?.head;

  return (
    <ConfigProvider theme={{ token: { zIndexPopupBase: TOP_Z } }}>
      <PlayerContext.Provider value={contextValue}>
        <div
          className="fixed inset-0 bg-white flex flex-col overflow-hidden"
          style={{ zIndex: TOP_Z }}
        >
          <IssuePlayerHeader
            issue={issue}
            card={card}
            email={email}
            browser={browser}
            os={os}
            device={device}
            countryCode={countryCode}
            city={city}
            date={date}
            variation={variation}
            tab={view === 'activity' || view === 'issue' ? view : null}
            setTab={(t) => setView(t)}
            onBack={back}
            onSetCritical={onSetCritical}
            prevId={prevId}
            nextId={nextId}
            onGoSession={goSession}
            onHighlight={() => setView('highlight')}
          />

          <div className="flex flex-1 min-h-0 w-full">
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              {contextValue.player ? (
                <PlayerContent
                  session={session}
                  fullscreen={false}
                  activeTab={playerActiveTab}
                  setActiveTab={setPlayerActiveTab}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Loader />
                </div>
              )}
            </div>

            {view === 'issue' && issue && (
              <IssuePanel
                issue={issue}
                card={card}
                onClose={() => setView(null)}
                onSetCritical={onSetCritical}
              />
            )}
          </div>
        </div>
      </PlayerContext.Provider>
    </ConfigProvider>
  );
}

export default observer(IssuePlayer);
