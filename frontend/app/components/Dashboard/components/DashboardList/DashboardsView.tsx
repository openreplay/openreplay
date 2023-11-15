import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import DashboardList from './DashboardList';
import Header from './Header';

function DashboardsView({ history, siteId }: { history: any; siteId: string }) {
  return (
    <div style={{ maxWidth: '1360px', margin: 'auto' }} className="bg-white rounded py-4 border">
      <Header history={history} siteId={siteId} />
      <DashboardList />
    </div>
  );
}

export default withPageTitle('Dashboards - OpenReplay')(DashboardsView);
