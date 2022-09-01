import React from 'react';
import { Button, PageTitle, Icon, Link } from 'UI';
import withPageTitle from 'HOCs/withPageTitle';
import MetricsList from '../MetricsList';
import MetricsSearch from '../MetricsSearch';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

interface Props {
    siteId: string;
}
function MetricsView({ siteId }: Props) {
    const { metricStore } = useStore();

    React.useEffect(() => {
        metricStore.fetchList();
    }, []);
    return useObserver(() => (
        <div style={{ maxWidth: '1300px', margin: 'auto'}} className="bg-white rounded py-4 border">
            <div className="flex items-center mb-4 justify-between px-6">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Metrics" className="" />
                </div>
                <div className="ml-auto flex items-center">
                    <Link to={'/metrics/create'}><Button variant="primary">Create</Button></Link>
                    <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
                        <MetricsSearch />
                    </div>
                </div>
            </div>
            <div className="text-base text-disabled-text flex items-center px-6">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
                Create custom Metrics to capture key interactions and track KPIs.
            </div>
            <MetricsList siteId={siteId} />
        </div>
    ));
}

export default withPageTitle('Metrics - OpenReplay')(MetricsView);
