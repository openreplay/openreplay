import React from 'react';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';
import CustomMetricOverviewChart from 'Components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricOverviewChart';
import ResponseTimeDistribution from 'Components/Dashboard/Widgets/PredefinedWidgets/ResponseTimeDistribution';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
}

function PageResponseTimeDistributionExample(props: Props) {
  const data = {
    chart: [],
  };
  return (
    <ExCard {...props}>
      <ResponseTimeDistribution data={data} />
    </ExCard>
  );
}

export default PageResponseTimeDistributionExample;
