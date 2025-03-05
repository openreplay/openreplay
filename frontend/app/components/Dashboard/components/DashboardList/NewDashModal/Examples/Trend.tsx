import React from 'react';

import LineChart from 'App/components/Charts/LineChart';
import { Styles } from 'Components/Dashboard/Widgets/common';
import ExCard from './ExCard';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
  onClick?: any;
  data?: any;
}

function ExampleTrend(props: Props) {
  return (
    <ExCard
      {...props}
      title={
        <div className="flex items-center gap-2">
          <div>{props.title}</div>
        </div>
      }
    >
      {/* <AreaChartCard data={props.data} label={props.data?.label}/> */}
      <LineChart
        data={props.data}
        colors={Styles.compareColors}
        params={{
          density: 21,
        }}
        yaxis={{ ...Styles.yaxis, domain: [0, 100] }}
        label={props.data?.label}
        onClick={props.onClick}
        hideLegend={props.data?.hideLegend}
      />
    </ExCard>
  );
}

export default ExampleTrend;
