import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Loader } from 'UI';
import { toggleFullscreen, closeBottomBlock } from 'Duck/components/player';
import { fetchList } from 'Duck/integrations';
import { PlayerProvider, connectPlayer, init as initPlayer, clean as cleanPlayer, Controls } from 'Player';
import cn from 'classnames';
import RightBlock from './RightBlock';
import withLocationHandlers from 'HOCs/withLocationHandlers';

import PlayerBlockHeader from '../Session_/PlayerBlockHeader';
import PlayerBlock from '../Session_/PlayerBlock';
import styles from '../Session_/session.module.css';
import { countDaysFrom } from 'App/date';

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

    const [activeTab, setActiveTab] = useState('');

    useEffect(() => {
        fetchList('issues');
        initPlayer(session, jwt);

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

    return (
        <PlayerProvider>
            <InitLoader className="flex-1">
                <PlayerBlockHeader activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} fullscreen={fullscreen} />
                <PlayerContentConnected activeTab={activeTab} fullscreen={fullscreen} live={live} setActiveTab={setActiveTab} session={session} />
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
    }),
    {
        toggleFullscreen,
        closeBottomBlock,
        fetchList,
    }
)(withLocationHandlers()(WebPlayer));
