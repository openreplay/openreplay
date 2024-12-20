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
  data: { chart: any[]; namesMap: string[] };
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: Record<string, any>;
  label?: string;
  hideLegend?: boolean;
  inGrid?: boolean;
}

function CustomAreaChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    colors,
    onClick = () => null,
    yaxis = { ...Styles.yaxis },
    label = 'Number of Sessions',
    hideLegend = false,
    inGrid,
  } = props;

  return (
    <ResponsiveContainer height={240} width="100%">
      <AreaChart
        data={data.chart}
        margin={Styles.chartMargins}
        onClick={onClick}
      >
        {!hideLegend && (
          <Legend iconType={'circle'} wrapperStyle={{ top: inGrid ? undefined : -18 }} />
        )}
        <CartesianGrid
          strokeDasharray="1 3"
          vertical={false}
          stroke="rgba(0,0,0,.15)"
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
             type="linear"
             dataKey={key}
             stroke={colors[index]}
             fill={colors[index]}
             fillOpacity={0.3}
             legendType={key === 'Total' ? 'none' : 'line'}
             dot={false}
             // strokeDasharray={'4 3'} FOR COPMARISON ONLY
           />
         ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default CustomAreaChart;
