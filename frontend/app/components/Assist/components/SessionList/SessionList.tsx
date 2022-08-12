import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { fetchLiveList } from 'Duck/sessions';
import { Loader, NoContent, Label } from 'UI';
import SessionItem from 'Shared/SessionItem';
import { useModal } from 'App/components/Modal';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

interface Props {
    loading: boolean;
    list: any;
    session: any;
    userId: any;
    fetchLiveList: (params: any) => void;
}
function SessionList(props: Props) {
    const { hideModal } = useModal();
    useEffect(() => {
        const params: any = {};
        if (props.session.userId) {
            params.userId = props.session.userId;
        }
        props.fetchLiveList(params);
    }, []);

    return (
        <div style={{ width: '50vw' }}>
            <div
                className="border-r shadow h-screen overflow-y-auto"
                style={{ backgroundColor: '#FAFAFA', zIndex: 999, width: '100%', minWidth: '700px' }}
            >
                <div className="p-4">
                    <div className="text-2xl">
                        {props.userId}'s <span className="color-gray-medium">Live Sessions</span>{' '}
                    </div>
                </div>
                <Loader loading={props.loading}>
                    <NoContent
                        show={!props.loading && props.list.size === 0}
                        title={
                            <div className="flex items-center justify-center flex-col">
                                <AnimatedSVG name={ICONS.NO_LIVE_SESSIONS} size={170} />
                                <div className="mt-2" />
                                <div className="text-center text-gray-600">No live sessions found.</div>
                            </div>
                        }
                    >
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
                                    <SessionItem onClick={() => hideModal()} key={session.sessionId} session={session} />
                                </div>
                            ))}
                        </div>
                    </NoContent>
                </Loader>
            </div>
        </div>
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
