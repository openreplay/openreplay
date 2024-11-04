import Breadcrumb from 'App/components/shared/Breadcrumb';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { withSiteId } from 'App/routes';
import { Loader } from 'UI';
import FunnelIssueDetails from '../Funnels/FunnelIssueDetails';

interface Props {
    history: any;
    match: any
    siteId: any
}
function WidgetSubDetailsView(props: Props) {
    const { match: { params: { siteId, dashboardId, metricId, subId } } } = props;
    const { metricStore, funnelStore } = useStore();
    const widget = useObserver(() => metricStore.instance);
    const issueInstance = useObserver(() => funnelStore.issueInstance);
    const loadingWidget = useObserver(() => metricStore.isLoading);
    // const isFunnel = widget.metricType === 'funnel'; // TODO uncomment this line
    const isFunnel = widget.metricType === 'table'; // TODO remove this line

    useEffect(() => {
        if (!widget || !widget.exists()) {
            metricStore.fetch(metricId);
        }
    }, []);

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: dashboardId ? 'Dashboard' : 'Cards', to: dashboardId ? withSiteId('/dashboard/' + dashboardId, siteId) : withSiteId('/metrics', siteId) },
                    { label: widget.name, to: withSiteId(`/metrics/${widget.metricId}`, siteId) },
                    { label: issueInstance ? issueInstance.title : 'Sub Details' }
                ]}
            />

            <Loader loading={loadingWidget}>
                {isFunnel && <FunnelIssueDetails funnelId={metricId} issueId={subId} />}
            </Loader>
        </div>
    );
}

export default WidgetSubDetailsView;