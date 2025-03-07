import React, { useState } from 'react';
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
import CustomTooltip from './CustomChartTooltip';
import { Styles } from '../common';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const {
    data = { chart: [], namesMap: [] },
    colors,
    onClick = () => null,
    yaxis = { ...Styles.yaxis },
    label = 'Number of Sessions',
    hideLegend = false,
    inGrid,
  } = props;

  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  const handleMouseOver = (key: string) => () => {
    setHoveredSeries(key);
  };

  const handleMouseLeave = () => {
    setHoveredSeries(null);
  };

  // Dynamically reorder namesMap to render hovered series last
  const reorderedNamesMap = hoveredSeries
    ? [...data.namesMap.filter((key) => key !== hoveredSeries), hoveredSeries]
    : data.namesMap;

  return (
    <ResponsiveContainer height={240} width="100%">
      <AreaChart
        data={data.chart}
        margin={Styles.chartMargins}
        onClick={onClick}
        onMouseLeave={handleMouseLeave} // Reset hover state on mouse leave
      >
        {!hideLegend && (
          <Legend
            iconType="wye"
            className="font-normal"
            wrapperStyle={{ top: inGrid ? undefined : -18 }}
            payload={data.namesMap.map((key, index) => ({
              value: key,
              type: 'line',
              color: colors[index],
              id: key,
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
          interval="equidistantPreserveStart"
        />
        <YAxis
          {...yaxis}
          allowDecimals={false}
          tickFormatter={(val) => Styles.tickFormatter(val)}
          label={{
            ...Styles.axisLabelLeft,
            value: label || t('Number of Sessions'),
          }}
        />
        <Tooltip
          {...Styles.tooltip}
          content={<CustomTooltip hoveredSeries={hoveredSeries} />} // Pass hoveredSeries to tooltip
        />
        {Array.isArray(reorderedNamesMap) &&
          reorderedNamesMap.map((key, index) => (
            <Area
              key={key}
              name={key}
              type="linear"
              dataKey={key}
              stroke={colors[data.namesMap.indexOf(key)]} // Match original color
              fill={colors[data.namesMap.indexOf(key)]}
              fillOpacity={hoveredSeries && hoveredSeries !== key ? 0.2 : 0.1} // Adjust opacity for non-hovered lines
              strokeOpacity={hoveredSeries && hoveredSeries !== key ? 0.2 : 1} // Adjust stroke opacity
              legendType={key === 'Total' ? 'none' : 'line'}
              dot={false}
              activeDot={
                hoveredSeries === key
                  ? {
                      r: 8,
                      stroke: '#fff',
                      strokeWidth: 2,
                      fill: colors[data.namesMap.indexOf(key)],
                      filter: 'drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.2))',
                    }
                  : false
              } // Show active dot only for the hovered line
              onMouseOver={handleMouseOver(key)} // Set hover state on mouse over
              style={{ cursor: 'pointer' }}
            />
          ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default CustomAreaChart;
