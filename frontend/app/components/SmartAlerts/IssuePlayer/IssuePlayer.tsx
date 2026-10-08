import withPageTitle from '@/components/hocs/withPageTitle';
import withPermissions from '@/components/hocs/withPermissions';
import { IconButton } from '@/ui/actions/IconButton';
import { ImpactMeter } from '@/ui/data/ImpactMeter';
import { Loader } from '@/ui/feedback/Loader';
import { PopoverPanel } from '@/ui/overlays/popover';
import { toast } from '@/ui/overlays/toast';
import { createWebPlayer } from 'Player';
import { ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import {
  smartIssueDetails,
  smartIssueSession,
  smartIssues,
  withSiteId,
} from 'App/saasComponents';
import PlayerContent from 'Components/Session/Player/ReplayPlayer/PlayerContent';
import { ReplayScreen } from 'Components/Session/ReplayScreen/ReplayScreen';
import RightBlock from 'Components/Session/RightBlock';
import {
  type IPlayerContext,
  PlayerContext,
  defaultContextValue,
} from 'Components/Session/playerContext';
import { wrapPlayerStore } from 'Components/Session/playerStore';

import { ShareDialog } from 'Shared/SharePopup/SharePopup';

import IssueActions from '../IssueDetail/IssueActions';
import { makeJourneyCard } from '../factories';
import {
  CriticalDialog,
  HideIssueModal,
  NotCriticalDialog,
  RenameIssueModal,
  fmtDate,
  impactLevel,
} from '../shared';

/* Minimal-UI session replay for an issue. Player bootstrap mirrors WebPlayer.tsx. */
function IssuePlayer() {
  const { sessionStore, issuesStore, projectsStore, integrationsStore } =
    useStore();
  const { t } = useTranslation();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const params = useParams<{ issueId: string; sessionId: string }>();
  const idParam = params.issueId ?? '';
  const id = idParam ? decodeURIComponent(idParam) : '';
  const sessionId = params.sessionId ?? '';

  const session = sessionStore.current;
  const { prefetched } = sessionStore;
  // partial context, filled in once the player loads
  const [contextValue, setContextValue] = React.useState<IPlayerContext>(
    defaultContextValue as any,
  );
  const playerRef = React.useRef<IPlayerContext['player'] | undefined>(
    undefined,
  );
  const adjustedRef = React.useRef(false);
  const [panel, setPanel] = React.useState<string | null>('ISSUE');
  const [shareAt, setShareAt] = React.useState<number | null>(null);
  const [details, setDetails] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [hideOpen, setHideOpen] = React.useState(false);
  const [notCritOpen, setNotCritOpen] = React.useState(false);

  const issue = issuesStore.byId(id);
  const realId = issue?.id ?? id;
  const sessions = issuesStore.exampleSessions(realId);
  const card = sessions.find((c) => c.sessionId === sessionId);
  // a session outside the /search sample has no card — fall back to its journey
  // so the journey panel / variation / steps still render (no issue-moment seek)
  const fallbackJourney = issuesStore.sessionJourney(sessionId);
  const effCard =
    card ?? (fallbackJourney ? makeJourneyCard(fallbackJourney) : undefined);

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);

  React.useEffect(() => {
    if (id) void issuesStore.loadIssue(id);
  }, [id]);

  React.useEffect(() => {
    if (realId) void issuesStore.loadSessions(realId);
  }, [realId]);

  React.useEffect(() => {
    if (!card && sessionId) void issuesStore.loadSessionJourney(sessionId);
  }, [card, sessionId]);

  // keep the global panel state in sync so RightBlock's ISSUE case can render it
  // (recomputed from the stable store refs, not effCard, to avoid a render loop)
  React.useEffect(() => {
    issuesStore.setPlayerPanel(
      issue?.id ?? null,
      card ?? (fallbackJourney ? makeJourneyCard(fallbackJourney) : null),
    );
  }, [issue?.id, card, fallbackJourney]);
  React.useEffect(() => () => issuesStore.clearPlayerPanel(), []);

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
      wrapPlayerStore,
      toast,
      prefetched,
    );
    if (prefetched && mobData?.data) {
      inst.preloadFirstFile(mobData.data, mobData.fileKey);
    }
    playerRef.current = inst;
    // sync the created player into context (same bootstrap as WebPlayer.tsx)
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
      {
        time: Math.max(rel, 0),
        label: issue ? t('Issue: {{head}}', { head: issue.head }) : undefined,
      },
    ]);
  }, [
    session.sessionId,
    session.durationMs,
    card?.issueTimestamp,
    issue?.head,
  ]);

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
    history.push(withSiteId(smartIssueSession(idParam, sid), siteId));
  const back = () =>
    history.push(
      withSiteId(issue ? smartIssueDetails(idParam) : smartIssues(), siteId),
    );
  const email = card?.email ?? session.userId ?? t('Anonymous');
  const date = card?.date ?? fmtDate(session.startedAt);
  const variation = effCard?.variation || effCard?.journey;
  const rows: [string, React.ReactNode][] = [
    [t('User'), email],
    [
      t('Location'),
      [card?.city ?? session.userCity, card?.country ?? session.userCountry]
        .filter(Boolean)
        .join(', '),
    ],
    [t('Browser'), card?.browser ?? session.userBrowser],
    [t('OS'), card?.os ?? session.userOs],
    [t('Device'), card?.device ?? session.userDeviceType],
    [t('Started'), date],
    ...(card?.metadata ?? []).map(
      (m) => [m.label, m.value] as [string, React.ReactNode],
    ),
  ];

  const lead = (
    <div className="m-rs__who">
      {issue && <ImpactMeter level={impactLevel(issue.impact)} compact />}
      <div className="m-rs__names">
        <span className="m-rs__name m-truncate">
          {variation || issue?.head || t('Session replay')}
        </span>
        <span className="m-rs__meta m-truncate">
          {variation && issue ? <span>{issue.head} ·</span> : null}
          <span>{email}</span>
          {date && <span>· {date}</span>}
          <PopoverPanel
            open={details}
            onOpenChange={setDetails}
            placement="bottomLeft"
            content={
              <dl className="m-rs__details">
                {rows
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <React.Fragment key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </React.Fragment>
                  ))}
              </dl>
            }
          >
            <button type="button" className="m-rs__more">
              · {t('More')}
            </button>
          </PopoverPanel>
        </span>
      </div>
    </div>
  );

  const onPanel = (key: string | null) => {
    const player = contextValue.player;
    if ((key == null) !== (panel == null) && player) {
      const { showEvents } = contextValue.store?.get() || ({} as any);
      if (key == null || !showEvents) player.toggleEvents();
    }
    setPanel(key);
  };

  return (
    <PlayerContext.Provider value={contextValue}>
      <ReplayScreen
        back={{ label: issue ? t('Issue') : t('Issues'), onClick: back }}
        lead={lead}
        actions={
          <>
            {issue && (
              <IssueActions
                issue={issue}
                onOpenCritical={() => issuesStore.openCriticalDialog(issue.id)}
                onNotCritical={() => setNotCritOpen(true)}
                onRename={() => setRenameOpen(true)}
                onHide={() => setHideOpen(true)}
              />
            )}
            <IconButton
              icon={<Share2 size={15} />}
              label={t('Share session')}
              variant="ghost"
              onClick={() => setShareAt(contextValue.store?.get()?.time ?? 0)}
            />
            <span className="m-rs__sep" aria-hidden="true" />
            <IconButton
              icon={<ChevronLeft size={15} />}
              label={t('Previous session')}
              variant="ghost"
              disabled={!prevId}
              onClick={() => prevId && goSession(prevId)}
            />
            <IconButton
              icon={<ChevronRight size={15} />}
              label={t('Next session')}
              variant="ghost"
              disabled={!nextId}
              onClick={() => nextId && goSession(nextId)}
            />
          </>
        }
        panels={[
          { key: 'ISSUE', label: t('Issue') },
          { key: 'EVENTS', label: t('Activity') },
        ]}
        panel={panel}
        onPanel={onPanel}
        renderPanel={(key) => (
          <RightBlock
            activeTab={key}
            setActiveTab={(k) => onPanel(k || null)}
            embedded
          />
        )}
      >
        {contextValue.player ? (
          <PlayerContent
            session={session}
            fullscreen={false}
            activeTab={panel ?? ''}
            setActiveTab={(k) => onPanel(k || null)}
            fillHeight
            noSidePanel
          />
        ) : (
          <Loader style={{ margin: 'auto' }} />
        )}
      </ReplayScreen>
      <ShareDialog
        open={shareAt !== null}
        time={shareAt ?? undefined}
        onClose={() => setShareAt(null)}
      />
      {issue && (
        <>
          <CriticalDialog
            issueId={issuesStore.criticalDialogId}
            issueHead={issue.head}
            onClose={issuesStore.closeCriticalDialog}
          />
          <NotCriticalDialog
            issue={notCritOpen ? issue : null}
            reasons={issuesStore.reasons.criticality}
            onClose={() => setNotCritOpen(false)}
          />
          <RenameIssueModal
            open={renameOpen}
            initial={issue.head}
            onCancel={() => setRenameOpen(false)}
            onConfirm={(name) => {
              issuesStore.rename(issue.id, name);
              setRenameOpen(false);
            }}
          />
          <HideIssueModal
            open={hideOpen}
            head={issue.head}
            reasons={issuesStore.reasons.hide}
            onCancel={() => setHideOpen(false)}
            onConfirm={(reasons, note) => {
              issuesStore.hide(issue.id, reasons, note);
              setHideOpen(false);
            }}
          />
        </>
      )}
    </PlayerContext.Provider>
  );
}

export default withPermissions(['SMART_ISSUES'])(
  withPageTitle('Smart Issues')(observer(IssuePlayer)),
);
