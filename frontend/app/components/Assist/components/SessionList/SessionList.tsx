import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { fetchLiveList } from 'Duck/sessions';
import { Loader, NoContent, Label } from 'UI';
import SessionItem from 'Shared/SessionItem';

interface Props {
    loading: boolean;
    list: any;
    session: any;
    fetchLiveList: (params: any) => void;
}
function SessionList(props: Props) {
    useEffect(() => {
        const params: any = {};
        if (props.session.userId) {
            params.userId = props.session.userId;
        }
        props.fetchLiveList(params);
    }, []);

    return (
        <Loader loading={props.loading}>
            <NoContent show={!props.loading && props.list.size === 0} title="No live sessions.">
                <div className="p-4">
                    {props.list.map((session: any) => (
                        <div className="mb-6">
                            {session.pageTitle && session.pageTitle !== '' && (
                                <div className="flex items-center mb-2">
                                    <Label size="small" className="p-1">
                                        <span className="color-gray-medium">TAB</span>
                                    </Label>
                                    <span className="ml-2 font-medium">{session.pageTitle}</span>
                                </div>
                            )}
                            <SessionItem key={session.sessionId} session={session} showActive={session.active} />
                        </div>
                    ))}
                </div>
            </NoContent>
        </Loader>
    );
}

export default connect(
    (state: any) => {
        const session = state.getIn(['sessions', 'current']);
        return {
            session,
            list: state.getIn(['sessions', 'liveSessions']).filter((i: any) => i.userId === session.userId && i.sessionId !== session.sessionId),
            loading: state.getIn(['sessions', 'fetchLiveListRequest', 'loading']),
        };
    },
    { fetchLiveList }
)(SessionList);
