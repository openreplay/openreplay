import React from 'react';
import { useStore } from 'App/mstore';
import { BackLink, Icon } from 'UI'
import { observer } from 'mobx-react-lite';
import { connect } from 'react-redux';
import { fetchSessions } from 'Duck/liveSearch';
import { useHistory } from 'react-router-dom';
import { liveSession, assist, withSiteId } from 'App/routes';
import AssistSessionsModal from 'App/components/Session_/Player/Controls/AssistSessionsModal';
import { useModal } from 'App/components/Modal';
import LivePlayer from 'App/components/Session/LivePlayer';

function Multiview({ total, fetchSessions, siteId }: { total: number; fetchSessions: (filter: any) => void, siteId: string }) {
  const { showModal, hideModal } = useModal();

  const { assistMultiviewStore } = useStore();
  const history = useHistory();

  React.useEffect(() => {
    if (total === 0) {
      fetchSessions({});
    }
  }, []);

  const openLiveSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    assistMultiviewStore.setActiveSession(sessionId);
    history.push(withSiteId(liveSession(sessionId), siteId));
  };
  const openList = () => {
    history.push(withSiteId(assist(), siteId))
  }
  const openListModal = () => {
    showModal(<AssistSessionsModal onAdd={hideModal} />, { right: true });
  }
  const replaceSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    showModal(<AssistSessionsModal onAdd={hideModal} replaceTarget={sessionId} />, { right: true });
  }
  const deleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    assistMultiviewStore.removeSession(sessionId)
  }

  const placeholder = new Array(4 - assistMultiviewStore.sessions.length).fill(0);

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="w-full p-4 flex justify-between items-center">
        {/* @ts-ignore */}
        <div><BackLink label="Back to sessions list" onClick={openList}/> </div>
        <div>{`Watching ${assistMultiviewStore.sessions.length} of ${total} Live Sessions`}</div>
      </div>
      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
        {assistMultiviewStore.sortedSessions.map((session) => (
          <div
            key={session.key}
            className="border hover:border-active-blue-border relative group cursor-pointer"
          >
            <div onClick={(e) => openLiveSession(e, session.sessionId)} className="w-full h-full">
              <LivePlayer isMultiview customSession={session} />
            </div>
            <div className="absolute bottom-0 w-full left-0 p-2 opacity-70 bg-gray-darkest text-white flex justify-between">
              <div>{session.userDisplayName}</div>
              <div className="hidden group-hover:flex items-center gap-2">
                <div className="cursor-pointer hover:font-semibold" onClick={(e) => replaceSession(e, session.sessionId)}>Replace Session</div>
                <div className="cursor-pointer hover:font-semibold" onClick={(e) => deleteSession(e, session.sessionId)}>
                  <Icon name="trash" size={18} color="white" />
                </div>
              </div>
            </div>
          </div>
        ))}
        {placeholder.map((_, i) => (
          <div key={i} className="border hover:border-active-blue-border flex items-center justify-center cursor-pointer" onClick={openListModal}>
            Add Session
          </div>
        ))}
      </div>
    </div>
  );
}

export default connect(
  (state: any) => ({
    total: state.getIn(['liveSearch', 'total']),
    siteId: state.getIn([ 'site', 'siteId' ])
  }),
  {
    fetchSessions,
  }
)(observer(Multiview));
