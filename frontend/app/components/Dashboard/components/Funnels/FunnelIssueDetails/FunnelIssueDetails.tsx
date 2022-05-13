import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Loader } from 'UI';
import FunnelIssuesListItem from '../FunnelIssuesListItem';
import SessionItem from 'App/components/shared/SessionItem/SessionItem';

interface Props {
    funnelId: string;
    issueId: string;
}
function FunnelIssueDetails(props: Props) {
    const { funnelStore } = useStore();
    const { funnelId, issueId } = props;
    const funnel = useObserver(() => funnelStore.instance);
    const funnelIssue = useObserver(() => funnelStore.issueInstance);
    const loading = useObserver(() => funnelStore.isLoadingIssues);

    useEffect(() => {
        if (!funnel || !funnel.exists()) { 
            // funnelStore.fetchFunnel(props.funnelId);
            funnelStore.fetchFunnel('143');
        }

        funnelStore.fetchIssue(funnelId, issueId);
    }, []);

    return (
        <Loader loading={loading}>
            { funnelIssue && <FunnelIssuesListItem
                issue={funnelIssue}
                inDetails={true}
            />}

            <div className="mt-6">
                {funnelIssue && funnelIssue.sessions.map(session => (
                    <SessionItem key={session.id} session={session} />
                ))}
            </div>
        </Loader>
    );
}

export default FunnelIssueDetails;