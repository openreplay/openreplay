import React from 'react';
import CustomMetricOverviewChart from 'Components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricOverviewChart';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
  data?: any;
}

function WebVital(props: Props) {
  const data = props.data || {
    value: 8.33316146432396,
    chart: [
      {
        timestamp: 1718755200000,
        value: 9.37317620650954,
      },
      {
        timestamp: 1718870399833,
        value: 6.294931643881294,
      },
      {
        timestamp: 1718985599666,
        value: 7.103504928806133,
      },
      {
        timestamp: 1719100799499,
        value: 7.946568201563857,
      },
      {
        timestamp: 1719215999332,
        value: 8.941158674935712,
      },
      {
        timestamp: 1719331199165,
        value: 10.180191693290734,
      },
      {
        timestamp: 1719446398998,
        value: 0,
      },
    ],
    unit: '%',
  };
  return (
    <ExCard {...props}>
      <CustomMetricOverviewChart data={data} />
    </ExCard>
  );
}

export default WebVital;
