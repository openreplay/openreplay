import React from 'react';
import { Button, Segmented, Tooltip, Checkbox } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Smartphone, Tablet, Monitor, RefreshCcw } from 'lucide-react';
import { FilterKey } from '@/types/filter/filterType';
import type { CheckboxProps } from 'antd';

function ClickMapRagePicker() {
  const [platform, setPlatform] = React.useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const { t } = useTranslation();
  const { metricStore, dashboardStore, filterStore } = useStore();

  const onChange: CheckboxProps['onChange'] = (e) => {
    const checked = e.target.checked;
    metricStore.setClickMapsRage(checked);
    metricStore.instance.includeClickRage = checked;
    metricStore.instance.updateKey('hasChanged', true);
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
    const platformId = metricStore.instance.series[0].filter.filters.findIndex(f => f.name === FilterKey.PLATFORM)
    if (platformId >= 0) {
      metricStore.instance.series[0].filter.filters[platformId].value = [platform];
      metricStore.instance.updateKey('hasChanged', true);
    } else {
      const newFilter = filterStore.findEvent({ name: FilterKey.PLATFORM })
      if (newFilter) {
        newFilter.value = [platform]
        metricStore.instance.series[0].filter.addFilter(newFilter)
      }
    }
  }, [platform])

  return (
    <div className="mr-4 flex items-center gap-2 cursor-pointer">
      <Checkbox onChange={onChange} checked={metricStore.includeClickRage}>
        {t('Include rage clicks')}
      </Checkbox>

      <Segmented
        options={[
          { label: <Monitor size={16} />, value: 'desktop' },
          { label: <Tablet size={16} />, value: 'tablet' },
          { label: <Smartphone size={16} />, value: 'mobile' },
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
