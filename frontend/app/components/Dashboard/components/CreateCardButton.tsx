import React from 'react';
import { Tooltip } from 'UI';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import AddCardSelectionModal from 'Components/Dashboard/components/AddCardSelectionModal';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

const MAX_CARDS = 29;

function CreateCardButton() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const { dashboardStore } = useStore();
  const dashboard: any = dashboardStore.selectedDashboard;
  const canAddMore: boolean = dashboard?.widgets?.length <= MAX_CARDS;

  return (
    <>
      <Tooltip
        delay={0}
        disabled={canAddMore}
        title={t('The number of cards in one dashboard is limited to 30.')}
      >
        <Button
          type="primary"
          disabled={!canAddMore}
          onClick={() => setOpen(true)}
          icon={<PlusOutlined />}
        >
          {t('Add Card')}
        </Button>
      </Tooltip>
      <AddCardSelectionModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default CreateCardButton;
