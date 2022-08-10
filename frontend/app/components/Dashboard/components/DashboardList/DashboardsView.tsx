import React from 'react';
import { Button, PageTitle, Icon, Link } from 'UI';
import withPageTitle from 'HOCs/withPageTitle';
import DashboardList from './DashboardList';
import DashboardSearch from './DashboardSearch';
 
function DashboardsView() {
    return (
        <div style={{ maxWidth: '1300px', margin: 'auto'}} className="bg-white rounded p-4">
            <div className="flex items-center mb-4 justify-between px-4">
                <div className="flex items-baseline mr-3">
                    <PageTitle title="Dashboards" className="" />
                </div>
                <Link to={'/metrics/create'}><Button variant="primary">Create Dashboard</Button></Link>
                <div className="ml-auto w-1/4">
                    <DashboardSearch />
                </div>
            </div>
            <div className="text-xl text-disabled-text flex items-center pl-4">
                <Icon name="info-circle-fill" className="mr-2" size={18} />
                A dashboard is a custom visualization using your OpenReplay data.
            </div>
            <DashboardList />
        </div>
    );
}

export default withPageTitle('Dashboards - OpenReplay')(DashboardsView);
