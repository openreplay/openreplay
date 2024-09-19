import React from 'react';
import { useEffect } from 'react';
import { connect } from 'react-redux';
import usePageTitle from 'App/hooks/usePageTitle';
import { fetch as fetchSession, clearCurrentSession } from 'Duck/sessions';
import { Loader } from 'UI';
import withPermissions from 'HOCs/withPermissions';
import LivePlayer from './LivePlayer';
import { clearLogs } from 'App/dev/console';
import { toast } from 'react-toastify';
import { useStore } from 'App/mstore'

function LiveSession({
    sessionId,
    fetchSession,
    hasSessionsPath,
    session,
    fetchFailed,
    clearCurrentSession,
}) {
    const { integrationsStore } = useStore();
    const fetchSlackList = integrationsStore.slack.fetchIntegrations;
    const [initialLoading, setInitialLoading] = React.useState(true);
    usePageTitle('OpenReplay Assist');

    useEffect(() => {
        clearLogs();
        void fetchSlackList();

        return () => {
            clearCurrentSession()
        };
    }, []);

    useEffect(() => {
        if (sessionId != null) {
            fetchSession(sessionId, true);
        } else {
            console.error('No sessionID in route.');
        }
    }, [sessionId, hasSessionsPath]);

    useEffect(() => {
        if (fetchFailed) {
            toast.error('Error getting live session');
            setInitialLoading(false);
        }
        if (session.sessionId) {
            setInitialLoading(false);
        }
    }, [session.sessionId, fetchFailed]);

    return (
        <Loader className="flex-1" loading={initialLoading}>
            {session.sessionId && <LivePlayer />}
        </Loader>
    );
}

export default withPermissions(['ASSIST_LIVE', 'SERVICE_ASSIST_LIVE'], '', true, false)(
    connect(
        (state, props) => {
            const {
                match: {
                    params: { sessionId },
                },
            } = props;
            const isAssist = state.getIn(['sessions', 'activeTab']).type === 'live';
            const hasSessiosPath = state
                .getIn(['sessions', 'sessionPath'])
                .pathname.includes('/sessions');
            return {
                sessionId,
                fetchFailed: state.getIn(['sessions', 'fetchFailed']),
                session: state.getIn(['sessions', 'current']),
                hasSessionsPath: hasSessiosPath && !isAssist,
            };
        },
        {
            fetchSession,
            clearCurrentSession,
        }
    )(LiveSession)
);
