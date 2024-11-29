import React from 'react';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Space } from 'antd';
import RangeGranularity from "./RangeGranularity";

function WidgetDateRange({ viewType = undefined, label = 'Time Range', isTimeseries = false }: any) {
  const { dashboardStore } = useStore();
  const density = dashboardStore.selectedDensity
  const onDensityChange = (density: number) => {
    dashboardStore.setDensity(density);
  }
  const period =  dashboardStore.drillDownPeriod;
  const compPeriod = dashboardStore.comparisonPeriod;
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
    dashboardStore.setComparisonPeriod(period);
    const periodTimestamps = period.toTimestamps();
    const compFilter = dashboardStore.cloneCompFilter();
    compFilter.merge({
      startTimestamp: periodTimestamps.startTimestamp,
      endTimestamp: periodTimestamps.endTimestamp,
    });
  }

  const hasGranularity = ['lineChart', 'barChart', 'areaChart'].includes(viewType);
  const hasCompare = ['lineChart', 'barChart', 'table', 'progressChart'].includes(viewType);
  return (
    <Space>
      {label && <span className="mr-1 color-gray-medium">{label}</span>}
      <SelectDateRange
        period={period}
        onChange={onChangePeriod}
        isAnt={true}
        useButtonStyle={true}
      />
      {isTimeseries ? (
        <>
          {hasGranularity ? (
            <RangeGranularity
              period={period}
              density={density}
              onDensityChange={onDensityChange}
            />
          ) : null}
          {hasCompare ?
            <SelectDateRange
              period={period}
              compPeriod={compPeriod}
              onChange={onChangePeriod}
              onChangeComparison={onChangeComparison}
              right={true}
              isAnt={true}
              useButtonStyle={true}
              comparison={true}
            />
          : null}
        </>
      ) : null}
    </Space>
  );
}

export default observer(WidgetDateRange);
