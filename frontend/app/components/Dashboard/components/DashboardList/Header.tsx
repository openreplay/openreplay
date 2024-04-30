import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import { withSiteId } from 'App/routes';
import { PageTitle } from 'UI';

import DashboardSearch from './DashboardSearch';
import NewDashboardModal from './NewDashModal';

function Header({ history, siteId }: { history: any; siteId: string }) {
  const [showModal, setShowModal] = React.useState(false);
  const { dashboardStore } = useStore();

  const onSaveDashboard = () => {
    dashboardStore.initDashboard();
    dashboardStore
      .save(dashboardStore.dashboardInstance)
      .then(async (syncedDashboard) => {
        dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
        history.push(
          withSiteId(`/dashboard/${syncedDashboard.dashboardId}`, siteId)
        );
      });
  };

  const onAddDashboardClick = () => {
    setShowModal(true);
  };

  const onClose = () => {
    setShowModal(false);
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex items-baseline mr-3">
          <PageTitle title="Dashboards" />
        </div>
        <div className="ml-auto flex items-center">
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={onAddDashboardClick}
          >
            Create Dashboard
          </Button>
          <div className="mx-2"></div>
          <div className="w-1/4" style={{ minWidth: 300 }}>
            <DashboardSearch />
          </div>
        </div>
      </div>
      <NewDashboardModal onClose={onClose} open={showModal} onSave={onSaveDashboard} />
    </>
  );
}

export default observer(Header);
