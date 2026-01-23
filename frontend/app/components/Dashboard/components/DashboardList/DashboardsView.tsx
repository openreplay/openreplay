import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import DashboardList from './DashboardList';
import Header from './Header';
import { PANEL_SIZES } from 'App/constants/panelSizes'

function DashboardsView() {
  return (
    <div
      style={{ maxWidth: PANEL_SIZES.maxWidth, margin: 'auto' }}
      className="bg-white rounded-lg py-4 border shadow-xs"
    >
      <Header />
      <DashboardList />
    </div>
  );
}

export default withPageTitle('Dashboards - OpenReplay')(DashboardsView);
