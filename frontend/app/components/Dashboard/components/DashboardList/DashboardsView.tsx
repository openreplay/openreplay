import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import DashboardList from './DashboardList';
import Header from './Header';

function DashboardsView({ history, siteId }: { history: any; siteId: string }) {
  return (
    <div
      style={{ maxWidth: '1360px', margin: 'auto' }}
      className="bg-white rounded-lg py-4 border shadow-sm"
    >
      <Header />
      <DashboardList />
    </div>
  );
}

export default withPageTitle('Dashboards - OpenReplay')(DashboardsView);
