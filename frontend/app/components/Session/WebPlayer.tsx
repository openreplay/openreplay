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
import { observer } from 'mobx-react-lite';

const TABS = {
  EVENTS: 'User Steps',
  CLICKMAP: 'Click Map',
};

function WebPlayer(props: any) {
  const {
    session,
    toggleFullscreen,
    closeBottomBlock,
    live,
    fullscreen,
    fetchList,
    customSession,
    isClickmap,
    insights,
    jumpTimestamp,
    onMarkerClick,
  } = props;
  const { notesStore } = useStore();
  const [activeTab, setActiveTab] = useState('');
  const [showNoteModal, setShowNote] = useState(false);
  const [noteItem, setNoteItem] = useState(null);
  const [contextValue, setContextValue] = useState<IPlayerContext>(defaultContextValue);

  useEffect(() => {
    if (!isClickmap) {
      fetchList('issues');
    }
    const usedSession = isClickmap && customSession ? customSession : session;

    const [WebPlayerInst, PlayerStore] = createWebPlayer(usedSession, (state) =>
      makeAutoObservable(state)
    );
    setContextValue({ player: WebPlayerInst, store: PlayerStore });

    props.fetchMembers();

    if (!isClickmap) {
      notesStore.fetchSessionNotes(session.sessionId).then((r) => {
        const note = props.query.get('note');
        if (note) {
          WebPlayerInst.pause();
          setNoteItem(notesStore.getNoteById(parseInt(note, 10), r));
          setShowNote(true);
        }
      });
    } else {
      WebPlayerInst.setMarkerClick(onMarkerClick)
    }

    const jumpToTime = props.query.get('jumpto');
    if (jumpToTime) {
      WebPlayerInst.jump(parseInt(jumpToTime));
    }

    return () => WebPlayerInst.clean();
  }, [session.sessionId]);

  const isPlayerReady = contextValue.store?.get().ready

  React.useEffect(() => {
    contextValue.player && contextValue.player.play()
    if (isClickmap && isPlayerReady && insights.size > 0) {
      setTimeout(() => {
        contextValue.player.jump(jumpTimestamp)
        contextValue.player.pause()
        contextValue.player.scaleFullPage()
        setTimeout(() => { contextValue.player.showClickmap(insights) }, 250)
      }, 500)
    }
    return () => {
      isPlayerReady && contextValue.player.showClickmap(null)
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

  if (!contextValue.player) return null;

  return (
    <PlayerContext.Provider value={contextValue}>
      <>
        {!isClickmap ? (
          <PlayerBlockHeader
            // @ts-ignore TODO?
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={TABS}
            fullscreen={fullscreen}
          />
        ) : null}
        {/* @ts-ignore  */}
        <PlayerContent
          activeTab={activeTab}
          fullscreen={fullscreen}
          live={live}
          setActiveTab={setActiveTab}
          session={session}
          isClickmap={isClickmap}
        />
        <Modal open={showNoteModal} onClose={onNoteClose}>
          {showNoteModal ? (
            <ReadNote
              userEmail={
                props.members.find((m: Record<string, any>) => m.id === noteItem?.userId)?.email
                || ''
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
    insights: state.getIn(['sessions', 'insights']),
    visitedEvents: state.getIn(['sessions', 'visitedEvents']),
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
)(withLocationHandlers()(observer(WebPlayer)));
