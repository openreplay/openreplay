import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Modal, Loader } from 'UI';
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
import { useParams } from 'react-router-dom'

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
  } = props;
  const { notesStore } = useStore();
  const [activeTab, setActiveTab] = useState('');
  const [showNoteModal, setShowNote] = useState(false);
  const [noteItem, setNoteItem] = useState<Note | undefined>(undefined);
  const [visuallyAdjusted, setAdjusted] = useState(false);
  // @ts-ignore
  const [contextValue, setContextValue] = useState<IPlayerContext>(defaultContextValue);
  let playerInst: IPlayerContext['player'];
  const params: { sessionId: string } = useParams()

  useEffect(() => {
    if (!session.sessionId || contextValue.player !== undefined) return;
    fetchList('issues');

    const [WebPlayerInst, PlayerStore] = createWebPlayer(session, (state) =>
      makeAutoObservable(state)
    );
    setContextValue({ player: WebPlayerInst, store: PlayerStore });
    playerInst = WebPlayerInst;

    notesStore.fetchSessionNotes(session.sessionId).then((r) => {
      const note = props.query.get('note');
      if (note) {
        setNoteItem(notesStore.getNoteById(parseInt(note, 10), r));
        setShowNote(true);
        WebPlayerInst.pause();
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
  }, [session.sessionId]);

  React.useEffect(() => {
    if (session.events.length > 0 || session.errors.length > 0) {
      contextValue.player?.updateLists?.(session)
    }
  }, [session.events, session.errors, contextValue.player])

  const { ready: isPlayerReady, firstVisualEvent: visualOffset } = contextValue.store?.get() || {}

  React.useEffect(() => {
    if (showNoteModal) {
      contextValue.player.pause()
    }

    if (activeTab === '' && !showNoteModal && isPlayerReady && contextValue.player) {
      contextValue.player.play()

      if (visualOffset !== 0 && !visuallyAdjusted) {
        contextValue.player.jump(visualOffset)
        setAdjusted(true)
      }
    }
  }, [activeTab, isPlayerReady, showNoteModal, visualOffset])

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(
    () => () => {
      console.debug('cleaning up player after', params.sessionId)
      toggleFullscreen(false);
      closeBottomBlock();
      playerInst?.clean();
      // @ts-ignore
      setContextValue(defaultContextValue);
    },
    [params.sessionId]
  );

  const onNoteClose = () => {
    setShowNote(false);
    contextValue.player.play();
  };

  if (!session.sessionId) return <Loader size={75} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translateX(-50%)', height: 75 }} />;

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
      {contextValue.player ? <PlayerContent
        activeTab={activeTab}
        fullscreen={fullscreen}
        setActiveTab={setActiveTab}
        session={session}
      /> : <Loader style={{ position: 'fixed', top: '0%', left: '50%', transform: 'translateX(-50%)' }} />}
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
