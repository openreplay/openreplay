import React from 'react';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Space } from 'antd';
import RangeGranularity from "./RangeGranularity";
import {
  CUSTOM_RANGE,
  DATE_RANGE_COMPARISON_OPTIONS,
} from 'App/dateRange';
import Period from 'Types/app/period';

function WidgetDateRange({
  label = 'Time Range',
  hasGranularSettings = false,
  hasGranularity = false,
  hasComparison = false,
  presetComparison = null,
}: any) {
  const { dashboardStore, metricStore } = useStore();
  const density = dashboardStore.selectedDensity
  const onDensityChange = (density: number) => {
    dashboardStore.setDensity(density);
  }
  const period =  dashboardStore.drillDownPeriod;
  const compPeriod = dashboardStore.comparisonPeriods[metricStore.instance.metricId];
  const drillDownFilter = dashboardStore.drillDownFilter;

  const onChangePeriod = (period: any) => {
      dashboardStore.setDrillDownPeriod(period);
      const periodTimestamps = period.toTimestamps();
      drillDownFilter.merge({
        startTimestamp: periodTimestamps.startTimestamp,
        endTimestamp: periodTimestamps.endTimestamp,
      });
  };

  const onChangeComparison = (period: any) => {
    dashboardStore.setComparisonPeriod(period, metricStore.instance.metricId);
  }

  React.useEffect(() => {
    if (presetComparison) {
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
        }, 1)
      } else {
        const day = 86400000;
        const originalPeriodLength = Math.ceil(
          (period.end - period.start) / day
        );
        const start = presetComparison[0];
        const end = presetComparison[1] + originalPeriodLength * day;

        // @ts-ignore
        const compRange = new Period({
          start,
          end,
          rangeName: CUSTOM_RANGE,
        });
        setTimeout(() => {
          onChangeComparison(compRange);
        }, 1)
      }
    }
  }, [presetComparison])

  const updateInstComparison = (range: [start: string, end?: string] | null) => {
    metricStore.instance.setComparisonRange(range);
    metricStore.instance.updateKey('hasChanged', true)
  }

  return (
    <Space>
      {label && <span className="mr-1 color-gray-medium">{label}</span>}
      <SelectDateRange
        period={period}
        onChange={onChangePeriod}
        isAnt={true}
        useButtonStyle={true}
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
          {hasComparison ?
            <SelectDateRange
              period={period}
              compPeriod={compPeriod}
              onChange={onChangePeriod}
              onChangeComparison={onChangeComparison}
              right={true}
              isAnt={true}
              useButtonStyle={true}
              comparison={true}
              updateInstComparison={updateInstComparison}
            />
          : null}
        </>
      ) : null}
    </Space>
  );
}

export default observer(WidgetDateRange);
