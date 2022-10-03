import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Loader, Modal } from 'UI';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import { fetchList } from 'Duck/integrations';
import { PlayerProvider, injectNotes, connectPlayer, init as initPlayer, clean as cleanPlayer, Controls } from 'Player';
import cn from 'classnames';
import RightBlock from './RightBlock';
import withLocationHandlers from 'HOCs/withLocationHandlers';
import { useStore } from 'App/mstore'
import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.module.css';
import { countDaysFrom } from 'App/date';
import ReadNote from '../Session_/Player/Controls/components/ReadNote';
import { fetchList as fetchMembers } from 'Duck/member';

const TABS = {
    EVENTS: 'User Actions',
    HEATMAPS: 'Click Map',
};

const InitLoader = connectPlayer((state) => ({
    loading: !state.initialized,
}))(Loader);

const PlayerContentConnected = connectPlayer((state) => ({
    showEvents: !state.showEvents,
    hasError: state.error,
}))(PlayerContent);

function PlayerContent({ session, live, fullscreen, activeTab, setActiveTab, hasError }) {
    const sessionDays = countDaysFrom(session.startedAt);
    return (
        <div className="relative">
            {hasError ? (
                <div className="inset-0 flex items-center justify-center absolute" style={{
                    // background: '#f6f6f6',
                    height: 'calc(100vh - 50px)',
                    zIndex: '999',
                }}>
                    <div className="flex flex-col items-center">
                        <div className="text-lg -mt-8">{sessionDays > 2 ? 'Session not found.' : 'This session is still being processed.'}</div>
                        <div className="text-sm">{sessionDays > 2 ? 'Please check your data retention policy.' : 'Please check it again in a few minutes.'}</div>
                    </div>
                </div>
            ) : (
                <div className={cn('flex', { 'pointer-events-none': hasError })}>
                    <div className="w-full" style={activeTab && !fullscreen ? { maxWidth: 'calc(100% - 270px)'} : undefined}>
                        <div className={cn(styles.session, 'relative')} data-fullscreen={fullscreen}>
                            <PlayerBlock activeTab={activeTab} />
                        </div>
                    </div>
                    {activeTab !== '' && <RightMenu activeTab={activeTab} setActiveTab={setActiveTab} fullscreen={fullscreen} tabs={TABS} live={live} />}
                </div>
            )}
        </div>
    );
}

function RightMenu({ live, tabs, activeTab, setActiveTab, fullscreen }) {
    return !live && !fullscreen && <RightBlock tabs={tabs} setActiveTab={setActiveTab} activeTab={activeTab} />;
}

function WebPlayer(props) {
    const { session, toggleFullscreen, closeBottomBlock, live, fullscreen, jwt, fetchList } = props;
    const { notesStore } = useStore()
    const [activeTab, setActiveTab] = useState('');
    const [showNoteModal, setShowNote] = useState(false)
    const [noteItem, setNoteItem] = useState(null)

    useEffect(() => {
        fetchList('issues');
        initPlayer(session, jwt);
        props.fetchMembers()

        notesStore.fetchSessionNotes(session.sessionId).then(r => {
            injectNotes(r)
            const note = props.query.get('note');
            if (note) {
                Controls.pause()
                setNoteItem(notesStore.getNoteById(parseInt(note, 10), r))
                setShowNote(true)
            }
        })

        const jumptTime = props.query.get('jumpto');
        if (jumptTime) {
            Controls.jump(parseInt(jumptTime));
        }

        return () => cleanPlayer();
    }, [session.sessionId]);

    // LAYOUT (TODO: local layout state - useContext or something..)
    useEffect(
        () => () => {
            toggleFullscreen(false);
            closeBottomBlock();
        },
        []
    );

    const onNoteClose = () => {setShowNote(false); Controls.togglePlay()}
    return (
        <PlayerProvider>
            <InitLoader className="flex-1">
                <PlayerBlockHeader activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} fullscreen={fullscreen} />
                <PlayerContentConnected activeTab={activeTab} fullscreen={fullscreen} live={live} setActiveTab={setActiveTab} session={session} />
            <Modal open={showNoteModal} onClose={onNoteClose}>
                {showNoteModal ? (
                    <ReadNote
                        userEmail={props.members.find(m => m.id === noteItem.userId)?.email || noteItem.userId}
                        timestamp={noteItem.timestamp}
                        tags={noteItem.tags}
                        isPublic={noteItem.isPublic}
                        message={noteItem.message}
                        sessionId={noteItem.sessionId}
                        date={noteItem.createdAt}
                        noteId={noteItem.noteId}
                        onClose={onNoteClose}
                    />
                ) : null}
            </Modal>
            </InitLoader>
        </PlayerProvider>
    );
}

export default connect(
    (state) => ({
        session: state.getIn(['sessions', 'current']),
        jwt: state.get('jwt'),
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
