import React from 'react';
import { Button, PageTitle } from 'UI';
import Select from 'Shared/Select';
import DashboardSearch from './DashboardSearch';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { withSiteId } from 'App/routes';

function Header({ history, siteId }: { history: any; siteId: string }) {
  const { dashboardStore } = useStore();
  const sort = useObserver(() => dashboardStore.sort);

  const onAddDashboardClick = () => {
    dashboardStore.initDashboard();
    dashboardStore.save(dashboardStore.dashboardInstance).then(async (syncedDashboard) => {
      dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
      history.push(withSiteId(`/dashboard/${syncedDashboard.dashboardId}`, siteId));
    });
  };

  return (
    <div className="flex items-center mb-4 justify-between px-6">
      <div className="flex items-baseline mr-3">
        <PageTitle title="Dashboards" />
      </div>
      <div className="ml-auto flex items-center">
        <Button variant="primary" onClick={onAddDashboardClick}>
          New Dashboard
        </Button>
        <div className="mx-2">
          <Select
            options={[
              { label: 'Newest', value: 'desc' },
              { label: 'Oldest', value: 'asc' },
            ]}
            defaultValue={sort.by}
            plain
            onChange={({ value }) => dashboardStore.updateKey('sort', { by: value.value })}
          />
        </div>
        <div className="w-1/4" style={{ minWidth: 300 }}>
          <DashboardSearch />
        </div>
      </div>
    </div>
  );
}

export default Header;
