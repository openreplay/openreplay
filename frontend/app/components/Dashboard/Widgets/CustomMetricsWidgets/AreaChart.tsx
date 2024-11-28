import React from 'react';
import CustomTooltip from "./CustomChartTooltip";
import { Styles } from '../common';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

interface Props {
  data: any;
  params: any;
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
}

function CustomMetricLineChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    params,
    colors,
    onClick = () => null,
    yaxis = { ...Styles.yaxis },
    label = 'Number of Sessions',
    hideLegend = false,
  } = props;

  return (
    <ResponsiveContainer height={240} width="100%">
      <AreaChart
        data={data.chart}
        margin={Styles.chartMargins}
        onClick={onClick}
      >
        {!hideLegend && (
          <Legend iconType={'circle'} wrapperStyle={{ top: -26 }} />
        )}
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#EEEEEE"
        />
        <XAxis {...Styles.xaxis} dataKey="time" interval={'equidistantPreserveStart'} />
        <YAxis
          {...yaxis}
          allowDecimals={false}
          tickFormatter={(val) => Styles.tickFormatter(val)}
          label={{
            ...Styles.axisLabelLeft,
            value: label || 'Number of Sessions',
          }}
        />
        <Tooltip {...Styles.tooltip} content={CustomTooltip} />
        {Array.isArray(data.namesMap) &&
         data.namesMap.map((key, index) => (
           <Area
             key={key}
             name={key}
             type="monotone"
             dataKey={key}
             stroke={colors[index]}
             color={colors[index]}
             legendType={key === 'Total' ? 'none' : 'line'}
             dot={false}
             // strokeDasharray={'4 3'} FOR COPMARISON ONLY
           />
         ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default CustomMetricLineChart;
