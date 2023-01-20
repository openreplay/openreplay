import React from 'react';
import { useStore } from 'App/mstore';
import { BackLink } from 'UI';
import { observer } from 'mobx-react-lite';
import { connect } from 'react-redux';
import { fetchSessions, customSetSessions } from 'Duck/liveSearch';
import { useHistory, useParams } from 'react-router-dom';
import { liveSession, assist, withSiteId, multiview } from 'App/routes';
import AssistSessionsModal from 'App/components/Session_/Player/Controls/AssistSessionsModal';
import { useModal } from 'App/components/Modal';
import LivePlayer from 'App/components/Session/LivePlayer';
import EmptyTile from './EmptyTile'
import SessionTileFooter from './SessionTileFooter'

function Multiview({
  total,
  fetchSessions,
  siteId,
  assistCredendials,
  customSetSessions,
}: {
  total: number;
  customSetSessions: (data: any) => void;
  fetchSessions: (filter: any) => void;
  siteId: string;
  assistCredendials: any;
  list: Record<string, any>[];
}) {
  const { showModal, hideModal } = useModal();

  const { assistMultiviewStore } = useStore();
  const history = useHistory();
  // @ts-ignore
  const { sessionsquery } = useParams();

  const onSessionsChange = (sessions: Record<string, any>[]) => {
    const sessionIdQuery = encodeURIComponent(sessions.map((s) => s.sessionId).join(','));
    return history.replace(withSiteId(multiview(sessionIdQuery), siteId));
  };

  React.useEffect(() => {
    assistMultiviewStore.setOnChange(onSessionsChange);

    if (sessionsquery) {
      const sessionIds = decodeURIComponent(sessionsquery).split(',');
      // preset
      assistMultiviewStore.presetSessions(sessionIds).then((data) => {
        customSetSessions(data);
      });
    } else {
      fetchSessions({});
    }
  }, []);

  const openLiveSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    assistMultiviewStore.setActiveSession(sessionId);
    history.push(withSiteId(liveSession(sessionId)+'?multi=true', siteId));
  };

  const returnToList = () => {
    assistMultiviewStore.reset()
    history.push(withSiteId(assist(), siteId));
  };

  const openListModal = () => {
    showModal(<AssistSessionsModal onAdd={hideModal} />, { right: true, width: 700 });
  };

  const replaceSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    showModal(<AssistSessionsModal onAdd={hideModal} replaceTarget={sessionId} />, { right: true, width: 700 });
  };

  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    assistMultiviewStore.removeSession(sessionId);
  };

  const emptySpace = 4 - assistMultiviewStore.sessions.length;

  const placeholder = emptySpace > 0 ? new Array(emptySpace).fill(0) : []

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="w-full p-4 flex justify-between items-center">
        <div>
          {/* @ts-ignore */}
          <BackLink label="Exit to sessions list" onClick={returnToList} />
        </div>
        <div>{`Watching ${assistMultiviewStore.sessions.length} of ${total} Live Sessions`}</div>
      </div>
      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
        {assistMultiviewStore.sortedSessions.map((session: Record<string, any>) => (
          <div
            key={session.key}
            className="border hover:bg-active-blue hover:border-borderColor-primary relative group cursor-pointer"
          >
            <div onClick={(e) => openLiveSession(e, session.sessionId)} className="w-full h-full">
              {session.agentToken ? (
                <LivePlayer
                  isMultiview
                  customSession={session}
                  customAssistCredendials={assistCredendials}
                />
              ) : (
                <div>Loading session</div>
              )}
            </div>
            <SessionTileFooter
              userDisplayName={session.userDisplayName}
              sessionId={session.sessionId}
              replaceSession={replaceSession}
              deleteSession={deleteSession}
            />
          </div>
        ))}
        {placeholder.map((_, i) => (
          <React.Fragment key={i}>
            <EmptyTile onClick={openListModal} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default connect(
  (state: any) => ({
    total: state.getIn(['liveSearch', 'total']),
    siteId: state.getIn(['site', 'siteId']),
  }),
  {
    fetchSessions,
    customSetSessions,
  }
)(observer(Multiview));
