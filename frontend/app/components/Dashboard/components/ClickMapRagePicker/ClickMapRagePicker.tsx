import React from 'react';
import { Checkbox } from 'UI';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { toJS } from 'mobx';
import { useTranslation } from 'react-i18next';

function ClickMapRagePicker() {
  const { t } = useTranslation();
  const { metricStore, dashboardStore } = useStore();

  const onToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    metricStore.setClickMapsRage(e.target.checked);
  };

  const refreshHeatmapSession = async () => {
    const oldData = metricStore.instance.toJson();
    metricStore.instance.updateKey('data', { sessionId: null, domURL: [] });
    try {
      await dashboardStore.fetchMetricChartData(
        metricStore.instance,
        oldData,
        false,
        dashboardStore.period,
      );

      metricStore.instance.updateKey('hasChanged', true);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(
    () => () => {
      metricStore.setClickMapsRage(false);
    },
    [],
  );

  return (
    <div className="mr-4 flex items-center gap-2 cursor-pointer">
      <Checkbox onChange={onToggle} label={t('Include rage clicks')} />

      <Button size="small" onClick={refreshHeatmapSession}>
        {t('Get new image')}
      </Button>
    </div>
  );
}

export default observer(ClickMapRagePicker);
