import React from 'react';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';
import InsightsCard from 'Components/Dashboard/Widgets/CustomMetricsWidgets/InsightsCard';
import { InsightIssue } from 'App/mstore/types/widget';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
}

function InsightsExample(props: Props) {
  const data = {
    issues: [
      {
        category: 'errors',
        name: 'Error: Invalid unit value NaN',
        value: 562,
        oldValue: null,
        ratio: 7.472410583698976,
        change: 1,
        isNew: true,
      },
      {
        category: 'errors',
        name: 'TypeError: e.node.getContext is not a function',
        value: 128,
        oldValue: 1,
        ratio: 1.7019013429065284,
        change: 12700.0,
        isNew: false,
      },
      {
        category: 'errors',
        name: 'Unhandled Promise Rejection: {"message":"! POST error on /client/members; 400","response":{}}',
        value: 26,
        oldValue: null,
        ratio: 0.34569871027788857,
        change: 1,
        isNew: true,
      },
    ].map(
      (i: any) =>
        new InsightIssue(
          i.category,
          i.name,
          i.ratio,
          i.oldValue,
          i.value,
          i.change,
          i.isNew,
        ),
    ),
  };
  return (
    <ExCard {...props}>
      <InsightsCard data={data} />
    </ExCard>
  );
}

export default InsightsExample;
