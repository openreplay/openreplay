import { HEATMAP_CLICK_MAP, HEATMAP_SCROLL_MAP } from '@/constants/card';
import { FilterKey } from '@/types/filter/filterType';
import { IconButton } from '@/ui/actions/IconButton';
import { MenuButton } from '@/ui/actions/menu-button';
import { Segmented } from '@/ui/inputs/toggle-group';
import { Tooltip } from '@/ui/overlays/tooltip';
import {
  Angry,
  Monitor,
  MousePointerClick,
  MoveVertical,
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
  const platform = (metric.series[0]?.filter.filters.find(
    (f) => f.name === FilterKey.USER_DEVICE_TYPE,
  )?.value[0] ?? 'desktop') as 'desktop' | 'mobile' | 'tablet';
  const { t } = useTranslation();

  const scrollMap = metric.metricOf === HEATMAP_SCROLL_MAP;

  const onChange = (checked: boolean) => {
    metricStore.setClickMapsRage(checked);
    metricStore.instance.includeClickRage = checked;
    metricStore.instance.updateKey('hasChanged', true);
  };

  const setMode = (metricOf: string) => {
    metricStore.instance.update({ metricOf });
    metricStore.instance.updateKey('hasChanged', true);
  };

  // the backend picks the session by hash; a new seed picks another candidate
  const seed = React.useRef(0);
  const refreshHeatmapSession = async () => {
    const oldData = metricStore.instance.toJson();
    metricStore.instance.updateKey('data', { sessionId: null, domURL: [] });
    seed.current += 1;
    try {
      await dashboardStore.fetchMetricChartData(
        metricStore.instance,
        { ...oldData, heatmapSeed: seed.current },
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

  // a heatmap is drawn for one device: one without a device filter gets the
  // default, which is not an edit of the card
  const setDevice = (device: string) => {
    const { filter } = metricStore.instance.series[0];
    const current = filter.filters.find(
      (f) => f.name === FilterKey.USER_DEVICE_TYPE,
    );
    if (current) {
      current.updateKey('value', [device]);
      return;
    }
    const newFilter = filterStore.findEvent({
      name: FilterKey.USER_DEVICE_TYPE,
    });
    if (newFilter) {
      newFilter.value = [device];
      filter.addFilter(newFilter, true);
    }
  };

  React.useEffect(() => {
    const filters = metricStore.instance.series[0]?.filter.filters;
    if (filters && !filters.some((f) => f.name === FilterKey.USER_DEVICE_TYPE))
      setDevice(platform);
  }, []);

  const setPlatform = (device: 'desktop' | 'mobile' | 'tablet') => {
    if (device === platform) return;
    setDevice(device);
    metricStore.instance.updateKey('hasChanged', true);
  };

  return (
    <>
      <MenuButton<string>
        ariaLabel={t('Heatmap')}
        icon={scrollMap ? <MoveVertical /> : <MousePointerClick />}
        value={scrollMap ? HEATMAP_SCROLL_MAP : HEATMAP_CLICK_MAP}
        onChange={setMode}
        options={[
          {
            value: HEATMAP_CLICK_MAP,
            label: t('Click map'),
            icon: <MousePointerClick />,
          },
          {
            value: HEATMAP_SCROLL_MAP,
            label: t('Scroll map'),
            icon: <MoveVertical />,
          },
        ]}
        align="end"
      />
      {!scrollMap && (
        <Tooltip
          title={
            metricStore.includeClickRage
              ? t('Rage clicks shown')
              : t('Show rage clicks')
          }
        >
          <span>
            <IconButton
              icon={<Angry size={13} />}
              label={t('Include rage clicks')}
              variant="ghost"
              pressed={metricStore.includeClickRage}
              onClick={() => onChange(!metricStore.includeClickRage)}
            />
          </span>
        </Tooltip>
      )}
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
