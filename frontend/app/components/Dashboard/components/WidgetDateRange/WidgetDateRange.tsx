import React from 'react';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Space } from 'antd';

function WidgetDateRange({ label = 'Time Range', isTimeseries = false }: any) {
  const { dashboardStore } = useStore();
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

  return (
    <Space>
      {label && <span className="mr-1 color-gray-medium">{label}</span>}
      <SelectDateRange
        period={period}
        onChange={onChangePeriod}
        right={true}
        isAnt={true}
        useButtonStyle={true}
      />
      {isTimeseries ? (
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
      ) : null}
    </Space>
  );
}

export default observer(WidgetDateRange);
