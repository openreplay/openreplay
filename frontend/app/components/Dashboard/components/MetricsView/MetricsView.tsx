import React from 'react';
import { Button, PageTitle, Link } from 'UI';
import { withSiteId, dashboardMetricCreate } from 'App/routes';

function MetricsView(props) {
    return (
        <div>
            <div className="flex items-center mb-4">
                <PageTitle title="Metrics" className="mr-3" />
                {/* <Link to={withSiteId(dashboardMetricCreate(dashboard.dashboardId), store.siteId)}><Button primary size="small">Add Metric</Button></Link> */}
            </div>
        </div>
    );
}

export default MetricsView;