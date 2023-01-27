import React from 'react';
import { Button, PageTitle, Toggler, Icon } from 'UI';
import Select from 'Shared/Select';
import DashboardSearch from './DashboardSearch';
import { useStore } from 'App/mstore';
import { observer, useObserver } from 'mobx-react-lite';
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
    <>
      <div className="flex items-center justify-between px-6">
        <div className="flex items-baseline mr-3">
          <PageTitle title="Dashboards" />
        </div>
        <div className="ml-auto flex items-center">
          <Button variant="primary" onClick={onAddDashboardClick}>
            New Dashboard
          </Button>
          <div className="mx-2"></div>
          <div className="w-1/4" style={{ minWidth: 300 }}>
            <DashboardSearch />
          </div>
        </div>
      </div>
      <div className="text-base text-disabled-text flex items-center px-6">
        <Icon name="info-circle-fill" className="mr-2" size={16} />
        A Dashboard is a collection of Cards that can be shared across teams.
      </div>
      <div className="border-y px-3 py-1 mt-2 flex items-center w-full justify-end gap-4">
        <Toggler
          label="Private Dashboards"
          checked={dashboardStore.filter.showMine}
          name="test"
          className="font-medium mr-2"
          onChange={() =>
            dashboardStore.updateKey('filter', {
              ...dashboardStore.filter,
              showMine: !dashboardStore.filter.showMine,
            })
          }
        />
        {/* <Select
          options={[
            { label: 'Visibility - All', value: 'all' },
            { label: 'Visibility - Private', value: 'private' },
            { label: 'Visibility - Team', value: 'team' },
          ]}
          defaultValue={'all'}
          plain
          onChange={({ value }) =>
            dashboardStore.updateKey('filter', {
              ...dashboardStore.filter,
              visibility: value.value,
            })
          }
        /> */}

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
    </>
  );
}

export default observer(Header);
