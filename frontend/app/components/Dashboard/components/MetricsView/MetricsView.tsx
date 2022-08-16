import React from 'react';
import { Button, PageTitle, Icon, Link } from 'UI';
import withPageTitle from 'HOCs/withPageTitle';
import MetricsList from '../MetricsList';
import MetricsSearch from '../MetricsSearch';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

interface Props{
    siteId: number;
}
function MetricsView({ siteId }: Props) {
    const { metricStore } = useStore();

    React.useEffect(() => {
        metricStore.fetchList();
    }, []);
    return useObserver(() => (
        <div style={{ maxWidth: '1300px', margin: 'auto'}} className="bg-white rounded py-4 px-6 border">
            <div className="flex items-center mb-4 justify-between">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Metrics" className="" />
                </div>
                <Link to={'/metrics/create'}><Button variant="primary">Create Metric</Button></Link>
                <div className="ml-auto w-1/4" style={{ minWidth: 300 }}>
                    <MetricsSearch />
                </div>
            </div>
            <div className="text-base text-disabled-text flex items-center">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
                Create custom Metrics to capture key interactions and track KPIs.
            </div>
            <MetricsList siteId={siteId} />
        </div>
    ));
}

export default withPageTitle('Metrics - OpenReplay')(MetricsView);
