import React from 'react';
import { useStore } from 'App/mstore';
import { BackLink } from 'UI';
import { observer } from 'mobx-react-lite';
import { useHistory, useParams } from 'react-router-dom';
import { liveSession, assist, withSiteId, multiview } from 'App/routes';
import AssistSessionsModal from 'App/components/Session_/Player/Controls/AssistSessionsModal';
import { useModal } from 'App/components/Modal';
import LivePlayer from 'App/components/Session/LivePlayer';
import EmptyTile from './EmptyTile';
import SessionTileFooter from './SessionTileFooter';
import { useTranslation } from 'react-i18next';

function Multiview({
  assistCredentials,
}: {
  assistCredentials: any;
  list: Record<string, any>[];
}) {
  const { t } = useTranslation();
  const { showModal, hideModal } = useModal();
  const { assistMultiviewStore, projectsStore, searchStoreLive, sessionStore } =
    useStore();
  const siteId = projectsStore.siteId!;
  const history = useHistory();
  // @ts-ignore
  const { sessionsquery } = useParams();
  const total = sessionStore.totalLiveSessions;

  const onSessionsChange = (
    sessions: Array<Record<string, any> | undefined>,
  ) => {
    const sessionIdQuery = encodeURIComponent(
      sessions.map((s) => s && s.sessionId).join(','),
    );
    return history.replace(withSiteId(multiview(sessionIdQuery), siteId));
  };

  React.useEffect(() => {
    assistMultiviewStore.setOnChange(onSessionsChange);

    if (sessionsquery) {
      const sessionIds = decodeURIComponent(sessionsquery).split(',');
      // preset
      assistMultiviewStore.presetSessions(sessionIds).then((data) => {
        sessionStore.customSetSessions(data);
      });
    } else {
      searchStoreLive.fetchSessions();
    }
  }, []);

  const openLiveSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    assistMultiviewStore.setActiveSession(sessionId);
    history.push(withSiteId(`${liveSession(sessionId)}?multi=true`, siteId));
  };

  const returnToList = () => {
    assistMultiviewStore.reset();
    history.push(withSiteId(assist(), siteId));
  };

  const openListModal = () => {
    showModal(<AssistSessionsModal onAdd={hideModal} />, {
      right: true,
      width: 700,
    });
  };

  const replaceSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    showModal(
      <AssistSessionsModal onAdd={hideModal} replaceTarget={sessionId} />,
      { right: true, width: 700 },
    );
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    assistMultiviewStore.removeSession(sessionId);
  };

  const emptySpace = 4 - assistMultiviewStore.sessions.length;

  const placeholder = emptySpace > 0 ? new Array(emptySpace).fill(0) : [];

  return (
    <div style={{ height: '95vh' }} className="full flex flex-col">
      <div className="w-full p-4 flex justify-between items-center">
        <div>
          {/* @ts-ignore */}
          <BackLink label={t('Exit to sessions list')} onClick={returnToList} />
        </div>
        <div>{`${t('Watching')} ${assistMultiviewStore.sessions.length} ${t('of')} ${total} ${t('Live Sessions')}`}</div>
      </div>
      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
        {assistMultiviewStore.sortedSessions.map(
          (session: Record<string, any>) => (
            <div
              key={session.key}
              className="border hover:bg-active-blue hover:border-borderColor-primary relative group cursor-pointer"
            >
              <div
                onClick={(e) => openLiveSession(e, session.sessionId)}
                className="w-full h-full"
              >
                {session.agentToken ? (
                  <LivePlayer
                    isMultiview
                    customSession={session}
                    customAssistCredentials={assistCredentials}
                  />
                ) : (
                  <div>{t('Loading session')}</div>
                )}
              </div>
              <SessionTileFooter
                userDisplayName={session.userDisplayName}
                sessionId={session.sessionId}
                replaceSession={replaceSession}
                deleteSession={deleteSession}
              />
            </div>
          ),
        )}
        {placeholder.map((_, i) => (
          <React.Fragment key={i}>
            <EmptyTile onClick={openListModal} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default observer(Multiview);
