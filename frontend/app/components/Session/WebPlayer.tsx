import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Modal } from 'UI';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import { fetchList } from 'Duck/integrations';
import { createWebPlayer } from 'Player';
import { makeAutoObservable } from 'mobx';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { useStore } from 'App/mstore';
import PlayerBlockHeader from './Player/ReplayPlayer/PlayerBlockHeader';
import ReadNote from '../Session_/Player/Controls/components/ReadNote';
import PlayerContent from './Player/ReplayPlayer/PlayerContent';
import { IPlayerContext, PlayerContext, defaultContextValue } from './playerContext';
import { observer } from 'mobx-react-lite';
import { Note } from "App/services/NotesService";

const TABS = {
  EVENTS: 'User Steps',
  CLICKMAP: 'Click Map',
};

function WebPlayer(props: any) {
  const {
    session,
    toggleFullscreen,
    closeBottomBlock,
    fullscreen,
    fetchList,
    insights,
    jumpTimestamp,
  } = props;
  const { notesStore } = useStore();
  const [activeTab, setActiveTab] = useState('');
  const [showNoteModal, setShowNote] = useState(false);
  const [noteItem, setNoteItem] = useState<Note | undefined>(undefined);
  // @ts-ignore
  const [contextValue, setContextValue] = useState<IPlayerContext>(defaultContextValue);

  useEffect(() => {
    if (!session.sessionId) return;
    fetchList('issues');

    const [WebPlayerInst, PlayerStore] = createWebPlayer(session, (state) =>
      makeAutoObservable(state)
    );
    setContextValue({ player: WebPlayerInst, store: PlayerStore });

    notesStore.fetchSessionNotes(session.sessionId).then((r) => {
      const note = props.query.get('note');
      if (note) {
        WebPlayerInst.pause();
        setNoteItem(notesStore.getNoteById(parseInt(note, 10), r));
        setShowNote(true);
      }
    })

    const jumpToTime = props.query.get('jumpto');
    const freeze = props.query.get('freeze')
    if (jumpToTime) {
      WebPlayerInst.jump(parseInt(jumpToTime));
    }
    if (freeze) {
      WebPlayerInst.freeze()
    }

    return () => WebPlayerInst.clean();
  }, [session.sessionId]);

  const isPlayerReady = contextValue.store?.get().ready

  React.useEffect(() => {
    if (activeTab !== 'Click Map') {
     contextValue.player && contextValue.player.play()
    }
  }, [insights, isPlayerReady, jumpTimestamp])

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
        setActiveTab={setActiveTab}
        session={session}
      />
      <Modal open={showNoteModal} onClose={onNoteClose}>
        {showNoteModal ? (
          <ReadNote
            note={noteItem}
            onClose={onNoteClose}
            notFound={!noteItem}
          />
        ) : null}
      </Modal>
    </PlayerContext.Provider>
  );
}

export default connect(
  (state: any) => ({
    session: state.getIn(['sessions', 'current']),
    insights: state.getIn(['sessions', 'insights']),
    visitedEvents: state.getIn(['sessions', 'visitedEvents']),
    jwt: state.getIn(['user', 'jwt']),
    fullscreen: state.getIn(['components', 'player', 'fullscreen']),
    showEvents: state.get('showEvents'),
    members: state.getIn(['members', 'list']),
  }),
  {
    toggleFullscreen,
    closeBottomBlock,
    fetchList,
  }
)(withLocationHandlers()(observer(WebPlayer)));
