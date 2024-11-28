import React from 'react';
import CustomTooltip from "./CustomChartTooltip";
import { Styles } from '../common';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface Props {
  data: { chart: any[], namesMap: string[] };
  compData: { chart: any[], namesMap: string[] } | null;
  params: any;
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
}

const getPath = (x, y, width, height) => {
  const radius = Math.min(width / 2, height / 2);
  return `
    M${x + radius},${y}
    H${x + width - radius}
    A${radius},${radius} 0 0 1 ${x + width},${y + radius}
    V${y + height - radius}
    A${radius},${radius} 0 0 1 ${x + width - radius},${y + height}
    H${x + radius}
    A${radius},${radius} 0 0 1 ${x},${y + height - radius}
    V${y + radius}
    A${radius},${radius} 0 0 1 ${x + radius},${y}
    Z
  `;
};

const PillBar = (props) => {
  const { fill, x, y, width, height, striped } = props;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        width={width}
        height={height}
        rx={Math.min(width / 2, height / 2)}
        ry={Math.min(width / 2, height / 2)}
        fill={fill}
      />
      {striped && (
        <rect
          width={width}
          height={height}
          clipPath="url(#pillClip)"
          fill="url(#diagonalStripes)"
        />
      )}
    </g>
  );
};



function CustomMetricLineChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    compData,
    params,
    colors,
    onClick = () => null,
    yaxis = { ...Styles.yaxis },
    label = 'Number of Sessions',
    hideLegend = false,
  } = props;

  const resultChart = data.chart.map((item, i) => {
    if (compData && compData.chart[i]) return { ...compData.chart[i], ...item };
    return item;
  });

  return (
    <ResponsiveContainer height={240} width="100%">
      <BarChart
        data={resultChart}
        margin={Styles.chartMargins}
        onClick={onClick}
      >
        <defs>
          <clipPath id="pillClip">
            <rect x="0" y="0" width="100%" height="100%" rx="10" ry="10" />
          </clipPath>
          <pattern
            id="diagonalStripes"
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(45)"
          >
            <line x1="0" y="0" x2="0" y2="8" stroke="white" strokeWidth="6" />
          </pattern>
        </defs>
        {!hideLegend && (
          <Legend iconType={'circle'} wrapperStyle={{ top: -26 }} />
        )}
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#EEEEEE"
        />
        <XAxis
          {...Styles.xaxis}
          dataKey="time"
          interval={'equidistantPreserveStart'}
        />
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
           <Bar
             key={key}
             name={key}
             type="monotone"
             dataKey={key}
             shape={(barProps) => (
               <PillBar {...barProps} fill={colors[index]} />
             )}
             legendType={key === 'Total' ? 'none' : 'line'}
             activeBar={
               <PillBar fill={colors[index]} stroke={colors[index]} />
             }
           />
         ))}
        {compData
         ? compData.namesMap.map((key, i) => (
            <Bar
              key={key}
              name={key}
              type="monotone"
              dataKey={key}
              shape={(barProps) => (
                <PillBar {...barProps} fill={colors[i]} barKey={i} stroke={colors[i]} striped />
              )}
              legendType={key === 'Total' ? 'none' : 'line'}
              activeBar={
                <PillBar fill={colors[i]} stroke={colors[i]} barKey={i} striped />
              }
            />
          ))
         : null}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default CustomMetricLineChart;
