import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Button, PageTitle, Link } from 'UI';
import { withSiteId, dashboardMetricCreate } from 'App/routes';
import withModal from 'App/components/Modal/withModal';
import DashboardWidgetGrid from '../DashboardWidgetGrid';

interface Props {

}
function DashboardView(props: Props) {
    const { dashboardStore } = useStore();
    const dashboard: any = dashboardStore.selectedDashboard
    
    return (
        <div>
            <div className="flex items-center mb-4 justify-between">
                <div className="flex items-center">
                    <PageTitle title={dashboard.name} className="mr-3" />
                    <Link to={withSiteId(dashboardMetricCreate(dashboard.dashboardId), dashboardStore.siteId)}><Button primary size="small">Add Metric</Button></Link>
                </div>
                <div>
                    Right
                </div>
            </div>
            <DashboardWidgetGrid />
        </div>
    )
}

export default withModal(observer(DashboardView));