import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

function FooterContent({ dashboardId, selected }: any) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { metricStore, dashboardStore } = useStore();
  const dashboard = useMemo(
    () => dashboardStore.getDashboard(dashboardId),
    [dashboardId],
  );

  const existingCardIds = useMemo(
    () => dashboard?.widgets?.map((i) => parseInt(i.metricId)),
    [dashboard],
  );
  const total = useMemo(
    () =>
      metricStore.filteredCards.filter(
        (i) => !existingCardIds?.includes(parseInt(i.metricId)),
      ).length,
    [metricStore.filteredCards],
  );

  const addSelectedToDashboard = () => {
    if (!dashboard || !dashboard.dashboardId) return;
    dashboardStore.addWidgetToDashboard(dashboard, selected).then(() => {
      hideModal();
      dashboardStore.fetch(dashboard.dashboardId!);
    });
  };

  return (
    <div className="flex items-center rounded border bg-gray-light-shade justify-between p-3">
      <div>
        {t('Selected')}&nbsp;
        <span className="font-medium">{selected.length}</span>&nbsp;{t('of')}
        &nbsp;
        <span className="font-medium">{total}</span>
      </div>
      <div className="flex items-center">
        <Button type="text" className="mr-2" onClick={hideModal}>
          {t('Cancel')}
        </Button>
        <Button
          disabled={selected.length === 0}
          type="primary"
          onClick={addSelectedToDashboard}
        >
          {t('Add Selected to Dashboard')}
        </Button>
      </div>
    </div>
  );
}

export default observer(FooterContent);
