import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React from 'react';
import FunnelIssuesListItem from '../FunnelIssuesListItem';
import { NoContent } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

interface Props {
    loading?: boolean; 
    issues: any;
}
function FunnelIssuesList(props: Props) {
    const { issues, loading } = props;
    const { funnelStore } = useStore();
    const issuesSort = useObserver(() => funnelStore.issuesSort);
    const issuesFilter = useObserver(() => funnelStore.issuesFilter.map((issue: any) => issue.value));
    
    let filteredIssues = useObserver(() => issuesFilter.length > 0 ? issues.filter((issue: any) => issuesFilter.includes(issue.type)) : issues);
    filteredIssues = useObserver(() => issuesSort.sort ? filteredIssues.slice().sort((a: { [x: string]: number; }, b: { [x: string]: number; }) => a[issuesSort.sort] - b[issuesSort.sort]): filteredIssues);
    filteredIssues = useObserver(() => issuesSort.order === 'desc' ? filteredIssues.reverse() : filteredIssues);

    return useObserver(() => (
        <NoContent
            show={!loading && filteredIssues.length === 0}
            title={
                <div className="flex flex-col items-center justify-center">
                    <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
                    <div className="mt-6 text-2xl">No issues found</div>
                </div>
            }
        >
            {filteredIssues.map((issue: any, index: React.Key) => (
                <div key={index} className="mb-4">
                    <FunnelIssuesListItem issue={issue} />
                </div>
            ))}
        </NoContent>
    ))
}

export default FunnelIssuesList;