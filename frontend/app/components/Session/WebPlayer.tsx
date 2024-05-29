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
import { Note } from 'App/services/NotesService';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const TABS = {
  EVENTS: 'Activity',
  CLICKMAP: 'Click Map',
  INSPECTOR: 'Tag'
};
const UXTTABS = {
  EVENTS: TABS.EVENTS
};

let playerInst: IPlayerContext['player'] | undefined;

function WebPlayer(props: any) {
  const { session, toggleFullscreen, closeBottomBlock, fullscreen, fetchList, startedAt } = props;
  const { notesStore, sessionStore, uxtestingStore } = useStore();
  const [activeTab, setActiveTab] = useState('');
  const [noteItem, setNoteItem] = useState<Note | undefined>(undefined);
  const [visuallyAdjusted, setAdjusted] = useState(false);
  // @ts-ignore
  const [contextValue, setContextValue] = useState<IPlayerContext>(defaultContextValue);
  const params: { sessionId: string } = useParams();
  const [fullView, setFullView] = useState(false);

  useEffect(() => {
    playerInst = undefined;
    if (!session.sessionId || contextValue.player !== undefined) return;
    fetchList('issues');
    sessionStore.setUserTimezone(session.timezone);
    const [WebPlayerInst, PlayerStore] = createWebPlayer(
      session,
      (state) => makeAutoObservable(state),
      toast
    );
    setContextValue({ player: WebPlayerInst, store: PlayerStore });
    playerInst = WebPlayerInst;

    notesStore.fetchSessionNotes(session.sessionId).then((r) => {
      const note = props.query.get('note');
      if (note) {
        setNoteItem(notesStore.getNoteById(parseInt(note, 10), r));
        WebPlayerInst.pause();
      }
    });

    const freeze = props.query.get('freeze');
    if (freeze) {
      void WebPlayerInst.freeze();
    }
  }, [session.sessionId]);

  const { firstVisualEvent: visualOffset, messagesProcessed } = contextValue.store?.get() || {};

  React.useEffect(() => {
    if (messagesProcessed && (session.events.length > 0 || session.errors.length > 0)) {
      contextValue.player?.updateLists?.(session);
    }
  }, [session.events, session.errors, contextValue.player, messagesProcessed]);

  React.useEffect(() => {
    if (noteItem !== undefined) {
      contextValue.player.pause();
    }

    if (activeTab === '' && messagesProcessed && contextValue.player) {
      const jumpToTime = props.query.get('jumpto');
      const shouldAdjustOffset = visualOffset !== 0 && !visuallyAdjusted;

      if (noteItem === undefined) contextValue.player.play();

      if (jumpToTime || shouldAdjustOffset) {
        if (jumpToTime > visualOffset) {
          const diff =
            startedAt < jumpToTime ? jumpToTime - startedAt : jumpToTime;
          contextValue.player.jump(Math.max(diff, 0));
        } else {
          contextValue.player.jump(visualOffset);
          setAdjusted(true);
        }
      }
    }
  }, [activeTab, noteItem, visualOffset, messagesProcessed]);

  React.useEffect(() => {
    if (activeTab === 'Click Map') {
      contextValue.player?.pause();
    }
  }, [activeTab]);

  // LAYOUT (TODO: local layout state - useContext or something..)
  useEffect(
    () => () => {
      console.debug('cleaning up player after', params.sessionId);
      toggleFullscreen(false);
      closeBottomBlock();
      playerInst?.clean();
      // @ts-ignore
      setContextValue(defaultContextValue);
    },
    [params.sessionId]
  );

  useEffect(() => {
    if (uxtestingStore.isUxt()) {
      setActiveTab('EVENTS');
    }
  }, [uxtestingStore.isUxt()]);

  const onNoteClose = () => {
    setNoteItem(undefined);
    contextValue.player.play();
  };

  useEffect(() => {
    const isFullView = new URLSearchParams(location.search).get('fullview')
    setFullView(isFullView === 'true');
  }, [session.sessionId]);

  if (!session.sessionId)
    return (
      <Loader
        size={75}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          height: 75
        }}
      />
    );

  return (
    <PlayerContext.Provider value={contextValue}>
      {!fullView && (
        <PlayerBlockHeader
          // @ts-ignore TODO?
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={uxtestingStore.isUxt() ? UXTTABS : TABS}
          fullscreen={fullscreen}
        />
      )}
      {/* @ts-ignore  */}
      {contextValue.player ? (
        <PlayerContent
          activeTab={activeTab}
          fullscreen={fullscreen}
          setActiveTab={setActiveTab}
          session={session}
        />
      ) : (
        <Loader
          style={{ position: 'fixed', top: '0%', left: '50%', transform: 'translateX(-50%)' }}
        />
      )}
      <Modal open={noteItem !== undefined} onClose={onNoteClose}>
        {noteItem !== undefined ? (
          <ReadNote note={noteItem} onClose={onNoteClose} notFound={!noteItem} />
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
    startedAt: state.getIn(['sessions', 'current']).startedAt || 0
  }),
  {
    toggleFullscreen,
    closeBottomBlock,
    fetchList
  }
)(withLocationHandlers()(observer(WebPlayer)));
