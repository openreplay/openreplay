import React from 'react';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Space } from 'antd';
import { CUSTOM_RANGE, DATE_RANGE_COMPARISON_OPTIONS } from 'App/dateRange';
import Period from 'Types/app/period';
import RangeGranularity from './RangeGranularity';
import { useTranslation } from 'react-i18next';

function WidgetDateRange({
  label = 'Time Range',
  hasGranularSettings = false,
  hasGranularity = false,
  hasComparison = false,
  presetComparison = null,
}: any) {
  const { dashboardStore, metricStore } = useStore();
  const density = dashboardStore.selectedDensity;
  const onDensityChange = (density: number) => {
    dashboardStore.setDensity(density);
  };
  const period = dashboardStore.drillDownPeriod;
  const compPeriod =
    dashboardStore.comparisonPeriods[metricStore.instance.metricId];
  const { drillDownFilter } = dashboardStore;

  const onChangePeriod = (period: any) => {
    dashboardStore.setDrillDownPeriod(period);
    const periodTimestamps = period.toTimestamps();
    drillDownFilter.merge({
      startTimestamp: periodTimestamps.startTimestamp,
      endTimestamp: periodTimestamps.endTimestamp,
    });
  };

  const onChangeComparison = (period: any) => {
    if (compPeriod && period) {
      if (compPeriod.start === period.start && compPeriod.end === period.end) {
        return;
      }
    }
    dashboardStore.setComparisonPeriod(period, metricStore.instance.metricId);
  };

  React.useEffect(() => {
    if (presetComparison && presetComparison.length) {
      const option = DATE_RANGE_COMPARISON_OPTIONS.find((option: any) => option.value === presetComparison[0]);
      if (option) {
        // @ts-ignore
        const newPeriod = new Period({
          start: period.start,
          end: period.end,
          substract: option.value,
        });
        setTimeout(() => {
          onChangeComparison(newPeriod);
        }, 1);
      } else {
        const start = parseInt(presetComparison[0], 10);
        const end = parseInt(presetComparison[1], 10);

        // @ts-ignore
        const compRange = new Period({
          start,
          end,
          rangeName: CUSTOM_RANGE,
        });
        setTimeout(() => {
          onChangeComparison(compRange);
        }, 1);
      }
    }
  }, [presetComparison]);

  const updateInstComparison = (
    range: [start: string, end?: string] | null,
  ) => {
    metricStore.instance.setComparisonRange(range);
    metricStore.instance.updateKey('hasChanged', true);
  };

  return (
    <Space>
      {label && <span className="mr-1 color-gray-medium">{label}</span>}
      <SelectDateRange
        period={period}
        onChange={onChangePeriod}
        isAnt
        useButtonStyle
      />
      {hasGranularSettings ? (
        <>
          {hasGranularity ? (
            <RangeGranularity
              period={period}
              density={density}
              onDensityChange={onDensityChange}
            />
          ) : null}
          {hasComparison ? (
            <SelectDateRange
              period={period}
              compPeriod={compPeriod}
              onChange={onChangePeriod}
              onChangeComparison={onChangeComparison}
              right={false}
              isAnt
              useButtonStyle
              comparison
              updateInstComparison={updateInstComparison}
            />
          ) : null}
        </>
      ) : null}
    </Space>
  );
}

export default observer(WidgetDateRange);
