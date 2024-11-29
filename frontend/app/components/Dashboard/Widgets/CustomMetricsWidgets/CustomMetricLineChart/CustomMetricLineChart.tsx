import React, { useState } from 'react';
import { formatTimeOrDate } from 'App/date';
import { Button, Table } from 'antd';
import type { TableProps } from 'antd';
import CustomTooltip from "../CustomChartTooltip";

import { Eye, EyeOff } from 'lucide-react';
import { Styles } from '../../common';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import cn from 'classnames';

interface Props {
  data: any;
  compData: any | null;
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
    compData = { chart: [], namesMap: [] },
    params,
    colors,
    onClick = () => null,
    yaxis = { ...Styles.yaxis },
    label = 'Number of Sessions',
    hideLegend = false,
  } = props;

  const resultChart = data.chart.map((item, i) => {
    if (compData && compData.chart[i]) return { ...compData.chart[i], ...item }
    return item
  })

  return (
    <ResponsiveContainer height={240} width="100%">
      <LineChart
        data={resultChart}
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
         data.namesMap.map((key, index) => key ? (
           <Line
             key={key}
             name={key}
             animationDuration={0}
             type="monotone"
             dataKey={key}
             stroke={colors[index]}
             fillOpacity={1}
             strokeWidth={2}
             strokeOpacity={key === 'Total' ? 0 : 0.6}
             legendType={key === 'Total' ? 'none' : 'line'}
             dot={false}
             activeDot={{
               fill: key === 'Total' ? 'transparent' : colors[index],
             }}
           />
         ) : null)}
        {compData?.namesMap.map((key, i) => data.namesMap[i] ? (
          <Line
            key={key}
            name={key}
            animationDuration={0}
            type="monotone"
            dataKey={key}
            stroke={colors[i]}
            fillOpacity={1}
            strokeWidth={2}
            strokeOpacity={0.6}
            legendType={'line'}
            dot={false}
            strokeDasharray={'4 3'}
            activeDot={{
              fill: colors[i],
            }}
          />
        ) : null)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default CustomMetricLineChart;
