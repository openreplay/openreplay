import React from 'react';
import { connect } from 'react-redux';
import { NoContent, Icon, Loader } from 'UI';
import Session from 'Types/session';
import SessionItem from 'Shared/SessionItem';
import stl from './sessionList.module.css';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

@connect((state) => ({
    currentSessionId: state.getIn(['sessions', 'current', 'sessionId']),
}))
class SessionList extends React.PureComponent {
    render() {
        const { similarSessions, loading, currentSessionId } = this.props;

        const similarSessionWithoutCurrent = similarSessions
            .map(({ sessions, ...rest }) => {
                return {
                    ...rest,
                    sessions: sessions.map(Session).filter(({ sessionId }) => sessionId !== currentSessionId),
                };
            })
            .filter((site) => site.sessions.length > 0);

        return (
            <Loader loading={loading}>
                <NoContent
                    show={!loading && (similarSessionWithoutCurrent.length === 0 || similarSessionWithoutCurrent.size === 0)}
                    title={
                        <div className="flex items-center justify-center flex-col">
                            <AnimatedSVG name={ICONS.NO_SESSIONS} size={170} />
                            <div className="mt-2" />
                            <div className="text-center text-gray-600">No sessions found.</div>
                        </div>
                    }
                >
                    <div className={stl.sessionList}>
                        {similarSessionWithoutCurrent.map((site) => (
                            <div className={stl.siteWrapper} key={site.host}>
                                <div className={stl.siteHeader}>
                                    <Icon name="window" size="14" color="gray-medium" marginRight="10" />
                                    <span>{site.name}</span>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    {site.sessions.map((session) => (
                                        <div className="border-b last:border-none">
                                            <SessionItem key={session.sessionId} session={session} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </NoContent>
            </Loader>
        );
    }
}

export default SessionList;
