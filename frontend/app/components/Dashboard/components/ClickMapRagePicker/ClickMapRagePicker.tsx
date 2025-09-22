import React from 'react';
import { Checkbox } from 'UI';
import { Button, Segmented, Tooltip } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Smartphone, Tablet, Monitor, RefreshCcw } from 'lucide-react';

function ClickMapRagePicker() {
  const [platform, setPlatform] = React.useState<'desktop' | 'mobile' | 'tablet'>('desktop');
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
        dashboardStore.drillDownPeriod,
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

  React.useEffect(() => {
    const platformId = metricStore.instance.series[0].filter.filters.findIndex(f => f.name === 'platform')
    if (platformId >= 0) {
      metricStore.instance.series[0].filter.filters[platformId].value = [platform];
      metricStore.instance.updateKey('hasChanged', true);
    }
  }, [platform])

  return (
    <div className="mr-4 flex items-center gap-2 cursor-pointer">
      <Checkbox onChange={onToggle} label={t('Include rage clicks')} />

      <Segmented
        options={[
          { label: <Monitor size={14} />, value: 'desktop' },
          { label: <Tablet size={14} />, value: 'tablet' },
          { label: <Smartphone size={14} />, value: 'mobile' },
        ]}
        value={platform}
        size="small"
        onChange={(value) => setPlatform(value as 'desktop' | 'mobile' | 'tablet')}
      />


      <Tooltip title={t('Get new image')}>
        <Button size="small" onClick={refreshHeatmapSession}>
          <RefreshCcw size={14} />
        </Button>
      </Tooltip>
    </div>
  );
}

export default observer(ClickMapRagePicker);
