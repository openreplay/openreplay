import React from 'react';
import { Button, PageTitle, Icon } from 'UI';
import withPageTitle from 'HOCs/withPageTitle';
import { useStore } from 'App/mstore';
import { withSiteId } from 'App/routes';

import DashboardList from './DashboardList';
import DashboardSearch from './DashboardSearch';

function DashboardsView({ history, siteId }: { history: any, siteId: string }) {
    const { dashboardStore } = useStore();

    const onAddDashboardClick = () => {
        dashboardStore.initDashboard();
        dashboardStore
        .save(dashboardStore.dashboardInstance)
        .then(async (syncedDashboard) => {
          dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
          history.push(withSiteId(`/dashboard/${syncedDashboard.dashboardId}`, siteId))
        })
    }

    return (
        <div style={{ maxWidth: '1300px', margin: 'auto'}} className="bg-white rounded py-4 px-6 border">
            <div className="flex items-center mb-4 justify-between">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Dashboards" />
                </div>
                <Button variant="primary" onClick={onAddDashboardClick}>Create Dashboard</Button>
                <div className="ml-auto w-1/4" style={{ minWidth: 300 }}>
                    <DashboardSearch />
                </div>
            </div>
            <div className="text-base text-disabled-text flex items-center">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
                A dashboard is a custom visualization using your OpenReplay data.
            </div>
            <DashboardList />
        </div>
    );
}

export default withPageTitle('Dashboards - OpenReplay')(DashboardsView);
