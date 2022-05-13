import Breadcrumb from 'App/components/shared/Breadcrumb';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { withSiteId } from 'App/routes';
import { Loader } from 'UI';
// import FunnelSubDetailsView from './FunnelSubDetailsView';

interface Props {
    history: any;
    match: any
    siteId: any
}
function WidgetSubDetailsView(props: Props) {
    const { match: { params: { siteId, dashboardId, metricId } } } = props;
    const { metricStore } = useStore();
    const widget = useObserver(() => metricStore.instance);
    const loadingWidget = useObserver(() => metricStore.isLoading);
    const isFunnel = widget.metricType === 'funnel';

    useEffect(() => {
        if (!widget || !widget.exists()) {
            metricStore.fetch(metricId);
        }
    }, []);

    return (
        <div>
            <Breadcrumb
                items={[
                    { label: dashboardId ? 'Dashboard' : 'Metrics', to: dashboardId ? withSiteId('/dashboard/' + dashboardId, siteId) : withSiteId('/metrics', siteId) },
                    { label: widget.name, to: withSiteId(`/metrics/${widget.metricId}`, siteId) },
                    { label: 'Sub Details' }
                ]}
            />

            <Loader loading={loadingWidget}>
                {/* {isFunnel && <FunnelSubDetailsView widget={widget} />} */}
            </Loader>
        </div>
    );
}

export default WidgetSubDetailsView;