import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React from 'react';
import FunnelIssuesListItem from '../FunnelIssuesListItem';

function FunnelIssuesList(props) {
    const { funnelStore } = useStore();
    const issuesFilter = useObserver(() => funnelStore.issuesFilter.map((issue: any) => issue.value));
    const issues = useObserver(() => funnelStore.issues);
    const filteredIssues = useObserver(() => issuesFilter.length > 0 ? issues.filter((issue: any) => issuesFilter.includes(issue.type)) : issues);

    return (
        <div>
            {filteredIssues.map((issue, index) => (
                <div key={index} className="mb-4">
                    <FunnelIssuesListItem issue={issue} />
                </div>
            ))}
        </div>
    );
}

export default FunnelIssuesList;