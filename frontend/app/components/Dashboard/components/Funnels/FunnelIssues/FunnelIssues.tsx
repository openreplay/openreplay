import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { NoContent, Loader } from 'UI';
import FunnelIssuesDropdown from '../FunnelIssuesDropdown';
import FunnelIssuesSort from '../FunnelIssuesSort';
import FunnelIssuesList from '../FunnelIssuesList';

function FunnelIssues(props) {
    const { funnelStore } = useStore();
    const funnel = useObserver(() => funnelStore.instance);
    const issues = useObserver(() => funnelStore.issues);
    const loading = useObserver(() => funnelStore.isLoadingIssues);

    useEffect(() => {
        // funnelStore.fetchIssues(funnel?.funnelId);
    }, []);

    return (
        <div className="my-8">
            <div className="flex justify-between">
                <h1 className="font-medium text-2xl">Most significant issues <span className="font-normal">identified in this funnel</span></h1>
            </div>
            <div className="my-6 flex justify-between items-start">
                <FunnelIssuesDropdown />
                <div className="flex-shrink-0">
                    <FunnelIssuesSort />
                </div>
            </div>
            <Loader loading={loading}>
                <NoContent
                    show={issues.length === 0}
                    title="No issues found."
                    animatedIcon="empty-state"
                >
                    <FunnelIssuesList />
                </NoContent>
            </Loader>
        </div>
    );
}

export default FunnelIssues;