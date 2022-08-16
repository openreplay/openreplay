import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import FunnelIssuesListItem from '../FunnelIssuesListItem';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { NoContent } from 'UI';
import { useModal } from 'App/components/Modal';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import FunnelIssueModal from '../FunnelIssueModal';

interface Props {
    loading?: boolean; 
    issues: any;
    history: any;
    location: any;
}
function FunnelIssuesList(props: RouteComponentProps<Props>) {
    const { issues, loading } = props;
    const { funnelStore } = useStore();
    const issuesSort = useObserver(() => funnelStore.issuesSort);
    const issuesFilter = useObserver(() => funnelStore.issuesFilter.map((issue: any) => issue.value));
    const { showModal } = useModal();
    const issueId = new URLSearchParams(props.location.search).get("issueId");

    const onIssueClick = (issue: any) => {
        props.history.replace({search: (new URLSearchParams({issueId : issue.issueId})).toString()});
    }

    useEffect(() => {
        if (!issueId) return;

        showModal(<FunnelIssueModal issueId={issueId} />, { right: true, onClose: () => {
            if (props.history.location.pathname.includes("/metric")) {
                props.history.replace({search: ""});
            }
        }});
    }, [issueId]);
    
    let filteredIssues = useObserver(() => issuesFilter.length > 0 ? issues.filter((issue: any) => issuesFilter.includes(issue.type)) : issues);
    filteredIssues = useObserver(() => issuesSort.sort ? filteredIssues.slice().sort((a: { [x: string]: number; }, b: { [x: string]: number; }) => a[issuesSort.sort] - b[issuesSort.sort]): filteredIssues);
    filteredIssues = useObserver(() => issuesSort.order === 'desc' ? filteredIssues.reverse() : filteredIssues);

    return useObserver(() => (
        <NoContent
            show={!loading && filteredIssues.length === 0}
            title={
                <div className="flex flex-col items-center justify-center">
                    <AnimatedSVG name={ICONS.NO_ISSUES} size="170" />
                    <div className="mt-3 text-xl">No issues found</div>
                </div>
            }
        >
            {filteredIssues.map((issue: any, index: React.Key) => (
                <div key={index} className="mb-4">
                    <FunnelIssuesListItem issue={issue} onClick={() => onIssueClick(issue)} />
                </div>
            ))}
        </NoContent>
    ))
}

export default withRouter(FunnelIssuesList) as React.FunctionComponent<RouteComponentProps<Props>>;
