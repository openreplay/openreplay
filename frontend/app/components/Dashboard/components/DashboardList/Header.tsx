import React from 'react';
import { PageTitle } from 'UI';
import DashboardSearch from './DashboardSearch';
import { useStore } from 'App/mstore';
import { observer, useObserver } from 'mobx-react-lite';
import { withSiteId } from 'App/routes';
import { Button } from 'antd'
import { PlusOutlined } from "@ant-design/icons";

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
      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex items-baseline mr-3">
          <PageTitle title="Dashboards" />
        </div>
        <div className="ml-auto flex items-center">
          <Button
            icon={<PlusOutlined />}
            type="primary" onClick={onAddDashboardClick}>
            Create Dashboard
          </Button>
          <div className="mx-2"></div>
          <div className="w-1/4" style={{ minWidth: 300 }}>
            <DashboardSearch />
          </div>
        </div>
        {/*<Select*/}
        {/*  options={[*/}
        {/*    { label: 'Newest', value: 'desc' },*/}
        {/*    { label: 'Oldest', value: 'asc' },*/}
        {/*  ]}*/}
        {/*  defaultValue={sort.by}*/}
        {/*  plain*/}
        {/*  onChange={({ value }) => dashboardStore.updateKey('sort', { by: value.value })}*/}
        {/*/>*/}
      </div>

  );
}

export default observer(Header);
