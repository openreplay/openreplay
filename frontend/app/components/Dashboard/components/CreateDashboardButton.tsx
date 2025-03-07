import React from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { useNavigate } from 'react-router';

interface Props {
  disabled?: boolean;
}

function CreateDashboardButton({ disabled }: Props) {
  const [dashboardCreating, setDashboardCreating] = React.useState(false);
  const { projectsStore, dashboardStore } = useStore();
  const siteId = projectsStore.siteId;
  const navigate = useNavigate();

  const createNewDashboard = async () => {
    setDashboardCreating(true);
    dashboardStore.initDashboard();
    await dashboardStore
      .save(dashboardStore.dashboardInstance)
      .then(async (syncedDashboard) => {
        dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
        navigate(`/${siteId}/dashboard/${syncedDashboard.dashboardId}`);
      })
      .finally(() => {
        setDashboardCreating(false);
      });
  };
  return (
    <>
      <Button
        loading={dashboardCreating}
        icon={<PlusOutlined />}
        disabled={disabled}
        type="primary"
        onClick={createNewDashboard}
      >
        Create Dashboard
      </Button>
    </>
  );
}

export default CreateDashboardButton;
