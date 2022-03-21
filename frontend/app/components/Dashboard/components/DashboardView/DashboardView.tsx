import React from 'react';
import WidgetWrapper from '../../WidgetWrapper';
import { observer } from 'mobx-react-lite';
import { withDashboardStore } from '../../store/store';
import { Button, PageTitle, Link } from 'UI';
import { withSiteId, dashboardMetricCreate } from 'App/routes';

function DashboardView(props) {
    const { store } = props;
    const dashboard = store.selectedDashboard
    const list = dashboard?.widgets;
    return (
        <div>
            <div className="flex items-center mb-4">
                <PageTitle title={dashboard.name} className="mr-3" />
                <Link to={withSiteId(dashboardMetricCreate(dashboard.dashboardId), store.siteId)}><Button primary size="small">Add Metric</Button></Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {list && list.map(item => <WidgetWrapper widget={item} key={item.widgetId} />)}
            </div>
        </div>
    )
}

export default withDashboardStore(observer(DashboardView));