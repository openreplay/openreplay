import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Styles } from 'Components/Dashboard/Widgets/common';
import ExCard from './ExCard';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
  onClick?: any;
  data?: any;
  hideLegend?: boolean;
}

function BarChartCard(props: Props) {
  const keys = props.data
    ? Object.keys(props.data.chart[0]).filter((key) => key !== 'time')
    : [];

  return (
    <ExCard {...props}>
      <ResponsiveContainer height={240} width="100%">
        <BarChart data={props.data?.chart} margin={Styles.chartMargins}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#EEEEEE"
          />
          <XAxis {...Styles.xaxis} dataKey="time" />
          <YAxis
            {...Styles.yaxis}
            tickFormatter={(val) => Styles.tickFormatter(val)}
            label={{
              ...Styles.axisLabelLeft,
              value: props.data?.label || 'Number of Errors',
            }}
            allowDecimals={false}
          />
          {!props.hideLegend && <Legend />}
          <Tooltip {...Styles.tooltip} />
          {keys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={Styles.compareColors[index % Styles.compareColors.length]}
              name={key}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ExCard>
  );
}

export default BarChartCard;

// Sample data function
// function generateBarChartData(): any[] {
//   const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
//   return months.map(month => ({
//     time: month,
//     key1: generateRandomValue(1000, 5000),
//     key2: generateRandomValue(1000, 5000),
//     key3: generateRandomValue(1000, 5000)
//   }));
// }
