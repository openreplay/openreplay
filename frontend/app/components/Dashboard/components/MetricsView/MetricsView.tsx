import React from 'react';
import { Button, PageTitle, Icon, Link } from 'UI';
import { withSiteId, dashboardMetricCreate } from 'App/routes';
import MetricsList from '../MetricsList';

function MetricsView(props) {
    return (
        <div>
            <div className="flex items-center mb-4 justify-between">
                <PageTitle title="Metrics" className="mr-3" />
                {/* <Link to={withSiteId(dashboardMetricCreate(dashboard.dashboardId), store.siteId)}><Button primary size="small">Add Metric</Button></Link> */}
                <div className="ml-auto w-1/4">
                    <input
                        className="bg-white p-2 border rounded w-full"
                        placeholder="Filter by title, type, dashboard and owner"
                    />
                </div>
            </div>
            <MetricsList />
        </div>
    );
}

export default MetricsView;