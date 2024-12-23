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
  inGrid?: boolean;
}

const getPath = (x, y, width, height) => {
  const radius = 4;
  return `
    M${x + radius},${y}
    H${x + width - radius}
    Q${x + width},${y} ${x + width},${y + radius}
    V${y + height}
    H${x}
    V${y + radius}
    Q${x},${y} ${x + radius},${y}
    Z
  `;
};

const PillBar = (props) => {
  const { fill, x, y, width, height, striped } = props;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <path
        d={getPath(0, 0, width, height)}
        fill={fill}
      />
      {striped && (
        <path
          d={getPath(0, 0, width, height)}
          clipPath="url(#pillClip)"
          fill="url(#diagonalStripes)"
        />
      )}
    </g>
  );
};

function CustomBarChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    compData = { chart: [], namesMap: [] },
    params,
    colors,
    onClick = () => null,
    yaxis = { ...Styles.yaxis },
    label = 'Number of Sessions',
    hideLegend = false,
    inGrid,
  } = props;

  const resultChart = data.chart.map((item, i) => {
    if (compData && compData.chart[i]) return { ...compData.chart[i], ...item };
    return item;
  });

  const mergedNameMap: { data: any, isComp: boolean, index: number }[] = [];
  for (let i = 0; i < data.namesMap.length; i++) {
    mergedNameMap.push({ data: data.namesMap[i], isComp: false, index: i });
    if (compData && compData.namesMap[i]) {
      mergedNameMap.push({ data: compData.namesMap[i], isComp: true, index: i });
    }
  }

  // Filter out comparison items for legend
  const legendItems = mergedNameMap.filter(item => !item.isComp);

  return (
    <ResponsiveContainer height={240} width="100%">
      <BarChart
        data={resultChart}
        margin={Styles.chartMargins}
        onClick={onClick}
        barSize={10}
        style={{ backgroundColor: 'transparent' }} 
      >
        <defs>
          <clipPath id="pillClip">
            <rect x="0" y="0" width="100%" height="100%" rx="4" ry="4" />
          </clipPath>
          <pattern
            id="diagonalStripes"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
            patternTransform="rotate(45)"
          >
            <line 
              x1="0" 
              y1="0" 
              x2="0" 
              y2="4" 
              stroke="#FFFFFF" 
              strokeWidth="2"
            />
          </pattern>
        </defs>
        {!hideLegend && (
          <Legend 
            iconType="rect" 
            wrapperStyle={{ top: inGrid ? undefined : -18 }}
            payload={legendItems.map(item => ({
              value: item.data,
              type: 'rect',
              color: colors[item.index],
              id: item.data
            }))}
          />
        )}
        <CartesianGrid
          strokeDasharray="1 3"
          vertical={false}
          stroke="rgba(0,0,0,.15)"
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
        {mergedNameMap.map((item) => (
          <Bar
            key={item.data}
            name={item.data}
            type="monotone"
            dataKey={item.data}
            fill={colors[item.index]}
            stroke={colors[item.index]}
            shape={(barProps: any) => (
              <PillBar
                {...barProps}
                fill={colors[item.index]}
                barKey={item.index}
                stroke={colors[item.index]}
                striped={item.isComp}
              />
            )}
            legendType="rect"
            activeBar={
              <PillBar
                fill={colors[item.index]}
                stroke={colors[item.index]}
                barKey={item.index}
                striped={item.isComp}
              />
            }
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default CustomBarChart;