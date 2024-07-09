import React from 'react';

import { PageTitle } from 'UI';

import DashboardSearch from './DashboardSearch';
import CreateDashboardButton from 'Components/Dashboard/components/CreateDashboardButton';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function Header() {
  const { dashboardStore } = useStore();
  const dashboardsSearch = dashboardStore.filter.query;
  const showSearch = dashboardStore.dashboards.length > 0 || dashboardsSearch;
  return (
    <>
      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex items-baseline mr-3">
          <PageTitle title="Dashboards" />
        </div>
        {showSearch && (
          <div className="ml-auto flex items-center">
            <CreateDashboardButton />
            <div className="mx-2"></div>
            <div className="w-1/4" style={{ minWidth: 300 }}>
              <DashboardSearch />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default observer(Header);
