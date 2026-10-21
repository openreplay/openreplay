import { FilterKey } from '@/types/filter/filterType';
import { IconButton } from '@/ui/actions/IconButton';
import { Switch } from '@/ui/inputs/switch';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  Monitor,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

function ClickMapRagePicker() {
  const { metricStore, dashboardStore, filterStore } = useStore();
  const metric = metricStore.instance;
  // @ts-ignore
  const metricPlatform = metric.series[0]?.filter.filters.find(
    (f) => f.name === FilterKey.USER_DEVICE_TYPE,
  )?.value[0] as 'desktop' | 'mobile' | 'tablet' | undefined;

  const [platform, setPlatform] = React.useState<
    'desktop' | 'mobile' | 'tablet'
  >(metricPlatform ?? 'desktop');
  const { t } = useTranslation();

  const onChange = (checked: boolean) => {
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
    const platformId = metricStore.instance.series[0].filter.filters.findIndex(
      (f) => f.name === FilterKey.USER_DEVICE_TYPE,
    );
    if (platformId >= 0) {
      metricStore.instance.series[0].filter.filters[platformId].value = [
        platform,
      ];
      metricStore.instance.updateKey('hasChanged', true);
    } else {
      const newFilter = filterStore.findEvent({
        name: FilterKey.USER_DEVICE_TYPE,
      });
      if (newFilter) {
        newFilter.value = [platform];
        metricStore.instance.series[0].filter.addFilter(newFilter, true);
      }
    }
  }, [platform]);

  return (
    <>
      <label className="m-cardp__switch">
        <Switch
          checked={metricStore.includeClickRage}
          onCheckedChange={onChange}
          aria-label={t('Include rage clicks')}
        />
        <MousePointerClick size={13} aria-hidden="true" />
        {t('Include rage clicks')}
      </label>
      <Segmented<'desktop' | 'mobile' | 'tablet'>
        value={platform}
        onChange={setPlatform}
        ariaLabel={t('Platform')}
        options={[
          {
            value: 'desktop',
            icon: <Monitor size={13} aria-hidden="true" />,
            title: t('Desktop'),
          },
          {
            value: 'tablet',
            icon: <Tablet size={13} aria-hidden="true" />,
            title: t('Tablet'),
          },
          {
            value: 'mobile',
            icon: <Smartphone size={13} aria-hidden="true" />,
            title: t('Mobile'),
          },
        ]}
      />
      <Tooltip title={t('Get a new image')}>
        <span>
          <IconButton
            icon={<RefreshCw size={13} />}
            label={t('Get a new image')}
            variant="ghost"
            onClick={() => void refreshHeatmapSession()}
          />
        </span>
      </Tooltip>
    </>
  );
}

export default observer(ClickMapRagePicker);
