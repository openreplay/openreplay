import React from 'react';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';
import InsightsCard from 'Components/Dashboard/Widgets/CustomMetricsWidgets/InsightsCard';
import { InsightIssue } from 'App/mstore/types/widget';
import SessionsPerBrowser from 'Components/Dashboard/Widgets/PredefinedWidgets/SessionsPerBrowser';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
}

function SessionsPerBrowserExample(props: Props) {
  const data = {
    chart: [
      {
        browser: 'Chrome',
        count: 1524,
        '126.0.0': 1157,
        '125.0.0': 224,
      },
      {
        browser: 'Edge',
        count: 159,
        '126.0.0': 145,
      },
    ],
  };
  return (
    <ExCard {...props}>
      <SessionsPerBrowser data={data} />
    </ExCard>
  );
}

export default SessionsPerBrowserExample;
