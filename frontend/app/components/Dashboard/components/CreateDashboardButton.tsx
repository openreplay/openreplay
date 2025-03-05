import React from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Props {
  disabled?: boolean;
}

function CreateDashboardButton({ disabled }: Props) {
  const { t } = useTranslation();
  const [dashboardCreating, setDashboardCreating] = React.useState(false);
  const { projectsStore, dashboardStore } = useStore();
  const { siteId } = projectsStore;
  const history = useHistory();

  const createNewDashboard = async () => {
    setDashboardCreating(true);
    dashboardStore.initDashboard();
    await dashboardStore
      .save(dashboardStore.dashboardInstance)
      .then(async (syncedDashboard) => {
        dashboardStore.selectDashboardById(syncedDashboard.dashboardId);
        history.push(`/${siteId}/dashboard/${syncedDashboard.dashboardId}`);
      })
      .finally(() => {
        setDashboardCreating(false);
      });
  };
  return (
    <Button
      loading={dashboardCreating}
      icon={<PlusOutlined />}
      disabled={disabled}
      type="primary"
      onClick={createNewDashboard}
    >
      {t('Create Dashboard')}
    </Button>
  );
}

export default CreateDashboardButton;
