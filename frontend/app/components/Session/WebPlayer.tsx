import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Modal } from 'UI';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import { fetchList } from 'Duck/integrations';
import { createWebPlayer } from 'Player';
import { makeAutoObservable } from 'mobx';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { useStore } from 'App/mstore';
import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import ReadNote from '../Session_/Player/Controls/components/ReadNote';
import { fetchList as fetchMembers } from 'Duck/member';
import PlayerContent from './PlayerContent';
import { IPlayerContext, PlayerContext, defaultContextValue } from './playerContext';

const TABS = {
  EVENTS: 'User Steps',
  HEATMAPS: 'Click Map',
};

function WebPlayer(props: any) {
  const {
    session,
    toggleFullscreen,
    closeBottomBlock,
     live,
     fullscreen,
     jwt,
     fetchList
  } = props;
  const { notesStore } = useStore();
  const [activeTab, setActiveTab] = useState('');
  const [showNoteModal, setShowNote] = useState(false);
  const [noteItem, setNoteItem] = useState(null);
  const [contextValue, setContextValue] = useState<IPlayerContext>(defaultContextValue);

  useEffect(() => {
    fetchList('issues');
    const [WebPlayerInst, PlayerStore] = createWebPlayer(session, (state) =>
      makeAutoObservable(state)
    );
    setContextValue({ player: WebPlayerInst, store: PlayerStore });

    props.fetchMembers();

    notesStore.fetchSessionNotes(session.sessionId).then((r) => {
      const note = props.query.get('note');
      if (note) {
        WebPlayerInst.pause();
        setNoteItem(notesStore.getNoteById(parseInt(note, 10), r));
        setShowNote(true);
      }
    });

    const jumptTime = props.query.get('jumpto');
    if (jumptTime) {
      WebPlayerInst.jump(parseInt(jumptTime));
    }

    return () => WebPlayerInst.clean();
  }, [session.sessionId]);

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(
    () => () => {
      toggleFullscreen(false);
      closeBottomBlock();
    },
    []
  );

  const onNoteClose = () => {
    setShowNote(false);
    contextValue.player.togglePlay();
  };

  if (!contextValue.player || !session) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
        <>
          <PlayerBlockHeader
          // @ts-ignore TODO?
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={TABS}
            fullscreen={fullscreen}
          />
          {/* @ts-ignore  */}
          <PlayerContent
            activeTab={activeTab}
            fullscreen={fullscreen}
            live={live}
            setActiveTab={setActiveTab}
            session={session}
          />
          <Modal open={showNoteModal} onClose={onNoteClose}>
            {showNoteModal ? (
              <ReadNote
                userEmail={
                  props.members.find((m: Record<string, any>) => m.id === noteItem?.userId)
                    ?.email || ''
                }
                note={noteItem}
                onClose={onNoteClose}
                notFound={!noteItem}
              />
            ) : null}
          </Modal>
        </>
    </PlayerContext.Provider>
  );
}

export default connect(
  (state: any) => ({
    session: state.getIn(['sessions', 'current']),
    jwt: state.getIn(['user', 'jwt']),
    fullscreen: state.getIn(['components', 'player', 'fullscreen']),
    showEvents: state.get('showEvents'),
    members: state.getIn(['members', 'list']),
  }),
  {
    toggleFullscreen,
    closeBottomBlock,
    fetchList,
    fetchMembers,
  }
)(withLocationHandlers()(WebPlayer));
