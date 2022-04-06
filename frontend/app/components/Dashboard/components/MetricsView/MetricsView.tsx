import React from 'react';
import { Button, PageTitle, Icon, Link } from 'UI';
import { withSiteId, metricCreate } from 'App/routes';
import MetricsList from '../MetricsList';
import MetricsSearch from '../MetricsSearch';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

interface Props{
    siteId: number;
}
function MetricsView(props: Props) {
    const { siteId } = props;
    const { metricStore } = useStore();

    React.useEffect(() => {
        metricStore.fetchList();
    }, []);
    return useObserver(() => (
        <div>
            <div className="flex items-center mb-4 justify-between">
                <PageTitle title="Metrics" className="mr-3" />
                <Link to={'/metrics/create'}><Button primary size="small">Add Metric</Button></Link>
                <div className="ml-auto w-1/3">
                    <MetricsSearch />
                </div>
            </div>
            <MetricsList />
        </div>
    ));
}

export default MetricsView;