import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Loader } from 'UI';

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
            funnelStore.fetchFunnel(props.funnelId);
        }

        funnelStore.fetchIssue(funnelId, issueId);
    }, []);

    return (
        <Loader loading={loading}>
            
        </Loader>
    );
}

export default FunnelIssueDetails;