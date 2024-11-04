import React from 'react';
import { NoContent } from 'UI';
import { Styles } from 'Components/Dashboard/Widgets/common';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

interface Props {
  data: any;
  label: string;
}

function Chart(props: Props) {
  const { data, label } = props;
  const gradientDef = Styles.gradientDef();

  return (
    <NoContent
      size="small"
      title={<div className={'text-base font-normal'}>No data available</div>}
      show={data && data.length === 0}
      style={{ height: '100px' }}
    >
      <ResponsiveContainer height={90} width="100%">
        <AreaChart
          data={data}
          margin={{
            top: 0,
            right: 0,
            left: 0,
            bottom: 0,
          }}
        >
          {gradientDef}
          <XAxis hide {...Styles.xaxis} dataKey="time" interval={7} />
          <YAxis
            hide
            {...Styles.yaxis}
            allowDecimals={false}
            tickFormatter={(val) => Styles.tickFormatter(val)}
            label={{ ...Styles.axisLabelLeft, value: label }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={Styles.strokeColor}
            fillOpacity={1}
            strokeWidth={2}
            strokeOpacity={0.8}
            fill={'url(#colorCount)'}
          />
        </AreaChart>
      </ResponsiveContainer>
    </NoContent>
  );
}

export default Chart;
