import React, { useEffect, useState } from 'react';
import { Modal, Loader } from 'UI';
import { createIOSPlayer } from 'Player';
import { makeAutoObservable } from 'mobx';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { useStore } from 'App/mstore';
import MobilePlayerHeader from 'Components/Session/Player/MobilePlayer/MobilePlayerHeader';
import { observer } from 'mobx-react-lite';
import { Note } from 'App/services/NotesService';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import PlayerErrorBoundary from 'Components/Session/Player/PlayerErrorBoundary';
import {
  IOSPlayerContext,
  defaultContextValue,
  MobilePlayerContext,
} from './playerContext';
import PlayerContent from './Player/MobilePlayer/PlayerContent';
import ReadNote from '../Session_/Player/Controls/components/ReadNote';

const TABS = {
  EVENTS: 'User Events',
};

let playerInst: IOSPlayerContext['player'] | undefined;

function MobilePlayer(props: any) {
  const {
    notesStore,
    sessionStore,
    uiPlayerStore,
    integrationsStore,
    userStore,
  } = useStore();
  const session = sessionStore.current;
  const [activeTab, setActiveTab] = useState('');
  const [noteItem, setNoteItem] = useState<Note | undefined>(undefined);
  // @ts-ignore
  const [contextValue, setContextValue] =
    useState<IOSPlayerContext>(defaultContextValue);
  const params: { sessionId: string } = useParams();
  const { fullscreen } = uiPlayerStore;
  const { toggleFullscreen } = uiPlayerStore;
  const { closeBottomBlock } = uiPlayerStore;

  useEffect(() => {
    playerInst = undefined;
    if (!session.sessionId || contextValue.player !== undefined) return;
    void integrationsStore.issues.fetchIntegrations();
    sessionStore.setUserTimezone(session.timezone);
    const [IOSPlayerInst, PlayerStore] = createIOSPlayer(
      session,
      (state) => makeAutoObservable(state),
      toast,
    );
    setContextValue({ player: IOSPlayerInst, store: PlayerStore });
    playerInst = IOSPlayerInst;

    notesStore.fetchSessionNotes(session.sessionId).then((r) => {
      const note = props.query.get('note');
      if (note) {
        setNoteItem(notesStore.getNoteById(parseInt(note, 10), r));
        IOSPlayerInst.pause();
      }
    });
  }, [session.sessionId]);

  const { messagesProcessed } = contextValue.store?.get() || {};

  React.useEffect(() => {
    if (
      (messagesProcessed && session.events.length > 0) ||
      session.errors.length > 0
    ) {
      contextValue.player?.updateLists?.(session);
    }
  }, [session.events, session.errors, contextValue.player, messagesProcessed]);

  React.useEffect(() => {
    if (noteItem !== undefined) {
      contextValue.player.pause();
    }

    if (
      activeTab === '' &&
      !noteItem !== undefined &&
      messagesProcessed &&
      contextValue.player
    ) {
      const jumpToTime = props.query.get('jumpto');

      if (jumpToTime) {
        contextValue.player.jump(parseInt(jumpToTime));
      }

      contextValue.player.play();
    }
  }, [activeTab, noteItem, messagesProcessed]);

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

  const onNoteClose = () => {
    setNoteItem(undefined);
    contextValue.player.play();
  };

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

  return (
    <MobilePlayerContext.Provider value={contextValue}>
      <MobilePlayerHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={TABS}
        fullscreen={fullscreen}
      />
      <PlayerErrorBoundary>
        {contextValue.player ? (
          <PlayerContent
            activeTab={activeTab}
            fullscreen={fullscreen}
            setActiveTab={setActiveTab}
            session={session}
          />
        ) : (
          <Loader
            style={{
              position: 'fixed',
              top: '0%',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        )}
        <Modal open={noteItem !== undefined} onClose={onNoteClose}>
          {noteItem !== undefined ? (
            <ReadNote
              note={noteItem}
              onClose={onNoteClose}
              notFound={!noteItem}
            />
          ) : null}
        </Modal>
      </PlayerErrorBoundary>
    </MobilePlayerContext.Provider>
  );
}

export default withLocationHandlers()(observer(MobilePlayer));
