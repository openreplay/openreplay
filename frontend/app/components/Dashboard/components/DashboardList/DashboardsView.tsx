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
        <div style={{ maxWidth: '1300px', margin: 'auto'}} className="bg-white rounded py-4 border">
            <div className="flex items-center mb-4 justify-between px-6">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Dashboards" />
                </div>
                <div className="ml-auto flex items-center">
                    <Button variant="primary" onClick={onAddDashboardClick}>Create</Button>
                    <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
                        <DashboardSearch />
                    </div>
                </div>
            </div>
            <div className="text-base text-disabled-text flex items-center px-6">
                <Icon name="info-circle-fill" className="mr-2" size={16} />
                A dashboard is a custom visualization using your OpenReplay data.
            </div>
            <DashboardList />
        </div>
    );
}

export default withPageTitle('Dashboards - OpenReplay')(DashboardsView);
