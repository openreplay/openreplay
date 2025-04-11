// Components/Dashboard/components/AddToDashboardButton.tsx

import React from 'react';
import { Grid2x2Check } from 'lucide-react';
import { Button, Modal } from 'antd';
import Select from 'Shared/Select/Select';
import { Form } from 'UI';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

interface Props {
  metricId: string;
}

export const showAddToDashboardModal = (
  metricId: string,
  dashboardStore: any,
) => {
  const { t } = useTranslation();
  const dashboardOptions = dashboardStore.dashboards.map((i: any) => ({
    key: i.id,
    label: i.name,
    value: i.dashboardId,
  }));
  let selectedId = dashboardOptions[0]?.value;

  const onSave = (close: any) => {
    const dashboard = dashboardStore.getDashboard(selectedId);
    if (dashboard) {
      dashboardStore.addWidgetToDashboard(dashboard, [metricId]).then(close);
    }
  };

  Modal.confirm({
    title: t('Add to selected dashboard'),
    icon: null,
    content: (
      <Form.Field>
        <Select
          options={dashboardOptions}
          defaultValue={selectedId}
          onChange={({ value }: any) => (selectedId = value.value)}
        />
      </Form.Field>
    ),
    cancelText: t('Cancel'),
    onOk: onSave,
    okText: t('Add'),
    footer: (_, { OkBtn, CancelBtn }) => (
      <>
        <CancelBtn />
        <OkBtn />
      </>
    ),
  });
};

function AddToDashboardButton({ metricId }: Props) {
  const { t } = useTranslation();
  const { dashboardStore } = useStore();

  return (
    <Button
      type="default"
      onClick={() => showAddToDashboardModal(metricId, dashboardStore)}
      icon={<Grid2x2Check size={18} />}
    >
      {t('Add to Dashboard')}
    </Button>
  );
}

export default AddToDashboardButton;
