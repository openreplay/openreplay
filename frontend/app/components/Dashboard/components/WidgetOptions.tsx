import Widget from '@/mstore/types/widget';
import { MenuButton } from '@/ui/actions/menu-button';
import { Switch } from '@/ui/inputs/switch';
import { FilterKey } from 'Types/filter/filterType';
import {
  ArrowDown01,
  ChartArea,
  ChartBar,
  ChartBarBig,
  ChartColumn,
  ChartColumnBig,
  ChartLine,
  ChartPie,
  CircleDashed,
  Hash,
  Library,
  Split,
  SquareActivity,
  Table,
  Users,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  FUNNEL,
  HEATMAP,
  TABLE,
  TIMESERIES,
  USER_PATH,
} from 'App/constants/card';
import { useStore } from 'App/mstore';
import ClickMapRagePicker from 'Components/Dashboard/components/ClickMapRagePicker/ClickMapRagePicker';

interface Option {
  key: string;
  label: string;
}

type MetricFormat = 'sessionCount' | 'eventCount' | 'userCount';

function WidgetOptions() {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const metric: Widget = metricStore.instance;

  const handleChange = (value: any) => {
    metric.update({ metricFormat: value });
    metric.updateKey('hasChanged', true);
  };

  const handleSortChange = (value: any) => {
    metric.update({ sortBy: value });
    metric.updateKey('hasChanged', true);
  };

  const errorSortOptions: Option[] = useMemo(
    () => [
      { key: 'time', label: t('Latest') },
      { key: 'sessions', label: t('Sessions') },
      { key: 'users', label: t('Users') },
    ],
    [],
  );

  const metricFormatLabel = ((mf: MetricFormat | undefined) => {
    switch (mf) {
      case 'sessionCount':
        return t('All Sessions');
      case 'eventCount':
        return t('Event Count');
      case 'userCount':
        return t('Unique Users');
      default:
        return t('Unique Users'); // fallback
    }
  })(metric.metricFormat as MetricFormat);

  // const hasSeriesTypes = [TIMESERIES, FUNNEL, TABLE].includes(metric.metricType);
  const hasViewTypes = [TIMESERIES, FUNNEL, USER_PATH].includes(
    metric.metricType,
  );
  const set = (patch: Record<string, any>) => {
    metric.update(patch);
    metric.updateKey('hasChanged', true);
  };
  const aggIcons: Record<string, React.ReactNode> = {
    sessionCount: <Library />,
    userCount: <Users />,
    eventCount: <SquareActivity />,
  };
  const views = VIEW_TYPES(t)[metric.metricType] ?? [];
  const view = views.find((v) => v.value === metric.viewType);

  return (
    <>
      {metric.metricType === TIMESERIES && (
        <MenuButton<string>
          ariaLabel={t('What is counted')}
          icon={aggIcons[metric.metricOf] ?? <Library />}
          value={metric.metricOf}
          onChange={(v) => set({ metricOf: v })}
          options={[
            {
              value: 'sessionCount',
              label: t('Total sessions'),
              icon: <Library />,
            },
            { value: 'userCount', label: t('Unique users'), icon: <Users /> },
            {
              value: 'eventCount',
              label: t('Total events'),
              icon: <SquareActivity />,
            },
          ]}
          align="end"
        />
      )}
      {metric.metricType === TABLE && metric.metricOf === FilterKey.ERRORS && (
        <MenuButton<string>
          ariaLabel={t('Sort')}
          icon={<ArrowDown01 />}
          label={`${t('Sort')} · ${errorSortOptions.find((o) => o.key === metric.sortBy)?.label ?? errorSortOptions[0].label}`}
          value={metric.sortBy ?? 'time'}
          onChange={handleSortChange}
          options={errorSortOptions.map((o) => ({
            value: o.key,
            label: o.label,
          }))}
          align="end"
        />
      )}
      {(metric.metricType === FUNNEL || metric.metricType === TABLE) &&
        metric.metricOf !== FilterKey.USERID &&
        metric.metricOf !== FilterKey.ERRORS && (
          <MenuButton<string>
            ariaLabel={t('Metric format')}
            icon={<Library />}
            label={metricFormatLabel}
            value={metric.metricFormat ?? 'sessionCount'}
            onChange={handleChange}
            options={[
              { value: 'sessionCount', label: t('All Sessions') },
              { value: 'userCount', label: t('Unique Users') },
              { value: 'eventCount', label: t('Total Events') },
            ]}
            align="end"
          />
        )}
      {hasViewTypes && views.length > 0 && (
        <MenuButton<string>
          ariaLabel={t('Visualization type')}
          icon={view?.icon}
          value={metric.viewType}
          onChange={(v) => set({ viewType: v })}
          options={views}
          align="end"
        />
      )}
      {metric.metricType === USER_PATH && (
        <label className="m-cardp__switch">
          <Switch
            checked={metric.hideExcess}
            onCheckedChange={(v) => set({ hideExcess: v })}
            aria-label={t('Group minor paths')}
          />
          {t('Group minor paths')}
        </label>
      )}
      {metric.metricType === HEATMAP && <ClickMapRagePicker />}
    </>
  );
}

const VIEW_TYPES = (
  t: (s: string) => string,
): Record<
  string,
  { value: string; label: string; icon: React.ReactNode }[]
> => ({
  [TIMESERIES]: [
    { value: 'lineChart', label: t('Line'), icon: <ChartLine /> },
    { value: 'areaChart', label: t('Stacked area'), icon: <ChartArea /> },
    { value: 'barChart', label: t('Column'), icon: <ChartColumn /> },
    { value: 'progressChart', label: t('Bar'), icon: <ChartBar /> },
    { value: 'pieChart', label: t('Pie'), icon: <ChartPie /> },
    { value: 'metric', label: t('Metric'), icon: <Hash /> },
    { value: 'table', label: t('Table'), icon: <Table /> },
  ],
  [FUNNEL]: [
    { value: 'chart', label: t('Funnel bar'), icon: <ChartBarBig /> },
    {
      value: 'columnChart',
      label: t('Funnel column'),
      icon: <ChartColumnBig />,
    },
    { value: 'metric', label: t('Metric'), icon: <Hash /> },
    { value: 'table', label: t('Table'), icon: <Table /> },
  ],
  [USER_PATH]: [
    { value: 'lineChart', label: t('Flow chart'), icon: <Split /> },
    { value: 'sunburst', label: t('Sunburst'), icon: <CircleDashed /> },
  ],
});

export default observer(WidgetOptions);
