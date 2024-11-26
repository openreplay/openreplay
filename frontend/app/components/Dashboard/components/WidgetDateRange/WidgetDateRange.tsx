import React from 'react';
import SelectDateRange from 'Shared/SelectDateRange';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Space } from 'antd';

function WidgetDateRange({ label = 'Time Range', comparison = false }: any) {
  const { dashboardStore } = useStore();
  const period = comparison ? dashboardStore.comparisonPeriod : dashboardStore.drillDownPeriod;
  const drillDownFilter = dashboardStore.drillDownFilter;

  const onChangePeriod = (period: any) => {
    if (comparison) dashboardStore.setComparisonPeriod(period);
    else {
      dashboardStore.setDrillDownPeriod(period);
      const periodTimestamps = period.toTimestamps();
      drillDownFilter.merge({
        startTimestamp: periodTimestamps.startTimestamp,
        endTimestamp: periodTimestamps.endTimestamp,
      });
    }
  };

  return (
    <Space>
      {label && <span className="mr-1 color-gray-medium">{label}</span>}
      <SelectDateRange
        period={period}
        onChange={onChangePeriod}
        right={true}
        isAnt={true}
        useButtonStyle={true}
        comparison={comparison}
      />
    </Space>
  );
}

export default observer(WidgetDateRange);
