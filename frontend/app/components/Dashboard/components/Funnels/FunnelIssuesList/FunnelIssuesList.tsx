import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React from 'react';
import FunnelIssuesListItem from '../FunnelIssuesListItem';

interface Props {
    issues: any;
}
function FunnelIssuesList(props: Props) {
    const { issues } = props;
    const { funnelStore } = useStore();
    const issuesSort = useObserver(() => funnelStore.issuesSort);
    const issuesFilter = useObserver(() => funnelStore.issuesFilter.map((issue: any) => issue.value));
    // const issues = useObserver(() => funnelStore.issues);
    let filteredIssues = useObserver(() => issuesFilter.length > 0 ? issues.filter((issue: any) => issuesFilter.includes(issue.type)) : issues);
    filteredIssues = useObserver(() => issuesSort.sort ? filteredIssues.slice().sort((a: { [x: string]: number; }, b: { [x: string]: number; }) => a[issuesSort.sort] - b[issuesSort.sort]): filteredIssues);
    filteredIssues = useObserver(() => issuesSort.order === 'desc' ? filteredIssues.reverse() : filteredIssues);

    return useObserver(() => (
        <div>
            {filteredIssues.map((issue: any, index: React.Key) => (
                <div key={index} className="mb-4">
                    <FunnelIssuesListItem issue={issue} />
                </div>
            ))}
        </div>
    ));
}

export default FunnelIssuesList;