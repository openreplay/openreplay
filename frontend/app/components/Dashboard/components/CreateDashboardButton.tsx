import { mobileScreen } from '@/utils/isMobile';
import { PlusOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import { LayoutTemplate as LayoutTemplateIcon } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory } from 'App/routing';
import DashboardTemplatesModal from 'Components/Dashboard/components/DashboardTemplates';

interface Props {
  disabled?: boolean;
}

function CreateDashboardButton({ disabled }: Props) {
  const { t } = useTranslation();
  const [dashboardCreating, setDashboardCreating] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
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
    <>
      <Dropdown.Button
        type="primary"
        size="small"
        disabled={disabled}
        loading={dashboardCreating}
        onClick={createNewDashboard}
        menu={{
          items: [
            {
              key: 'template',
              icon: <LayoutTemplateIcon size={14} />,
              label: t('From template…'),
              onClick: () => setTemplatesOpen(true),
            },
          ],
        }}
      >
        <PlusOutlined />
        {mobileScreen ? undefined : t('Create Dashboard')}
      </Dropdown.Button>
      <DashboardTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
      />
    </>
  );
}

export default CreateDashboardButton;
