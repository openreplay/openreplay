import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React from 'react';
import FunnelIssuesListItem from '../FunnelIssuesListItem';

function FunnelIssuesList(props) {
    const { funnelStore } = useStore();
    const issues = useObserver(() => funnelStore.issues);

    return (
        <div>
            {issues.map((issue, index) => (
                <div key={index}>
                    <FunnelIssuesListItem issue={issue} />
                </div>
            ))}
        </div>
    );
}

export default FunnelIssuesList;