import React, { useState } from 'react';
import {
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { NoContent } from 'UI';
import { filtersMap } from 'Types/filter/newFilter';
import { numberWithCommas } from 'App/utils';
import { Styles } from '../../common';
import CustomTooltip from '../CustomChartTooltip';

interface Props {
  metric: {
    metricOf: string;
    metricType: string;
  };
  data: {
    chart: any[];
    namesMap: string[];
  };
  colors: any;
  onClick?: (filters) => void;
  inGrid?: boolean;
}

function CustomMetricPieChart(props: Props) {
  const { metric, data, onClick = () => null, inGrid } = props;

  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  const onClickHandler = (event) => {
    if (event && !event.payload.group) {
      const filters = Array<any>();
      const filter = { ...filtersMap[metric.metricOf] };
      filter.value = [event.payload.name];
      filter.type = filter.key;
      delete filter.key;
      delete filter.operatorOptions;
      delete filter.category;
      delete filter.icon;
      delete filter.label;
      delete filter.options;

      filters.push(filter);
      onClick(filters);
    }
  };

  const handleMouseOver = (name: string) => setHoveredSeries(name);
  const handleMouseLeave = () => setHoveredSeries(null);

  const getTotalForSeries = (series: string) =>
    data.chart ? data.chart.reduce((acc, curr) => acc + curr[series], 0) : 0;

  const values = data.namesMap.map((k) => ({
    name: k,
    value: getTotalForSeries(k),
  }));

  const highest = values.reduce(
    (acc, curr) => (acc.value > curr.value ? acc : curr),
    { name: '', value: 0 },
  );

  return (
    <NoContent
      size="small"
      title="No data available"
      show={!data.chart || data.chart.length === 0}
      style={{ minHeight: '240px' }}
    >
      <ResponsiveContainer height={240} width="100%">
        <PieChart>
          <Legend
            iconType="triangle"
            wrapperStyle={{ top: inGrid ? undefined : -18 }}
          />
          <Tooltip content={<CustomTooltip hoveredSeries={hoveredSeries} />} />
          <Pie
            isAnimationActive={false}
            data={values}
            cx="50%"
            cy="60%"
            innerRadius={60}
            outerRadius={100}
            activeIndex={1}
            onClick={onClickHandler}
            onMouseOver={({ name }) => handleMouseOver(name)}
            onMouseLeave={handleMouseLeave}
            labelLine={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              value,
            }) => {
              const RADIAN = Math.PI / 180;
              const radius1 = 15 + innerRadius + (outerRadius - innerRadius);
              const radius2 = innerRadius + (outerRadius - innerRadius);
              const x2 = cx + radius1 * Math.cos(-midAngle * RADIAN);
              const y2 = cy + radius1 * Math.sin(-midAngle * RADIAN);
              const x1 = cx + radius2 * Math.cos(-midAngle * RADIAN);
              const y1 = cy + radius2 * Math.sin(-midAngle * RADIAN);

              const percentage = (value * 100) / highest.value;

              if (percentage < 3) {
                return null;
              }

              return (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#3EAAAF"
                  strokeWidth={1}
                />
              );
            }}
            label={({
              cx,
              cy,
              midAngle,
              innerRadius,
              outerRadius,
              value,
              index,
            }) => {
              const RADIAN = Math.PI / 180;
              const radius = 20 + innerRadius + (outerRadius - innerRadius);
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              const percentage = (value / highest.value) * 100;
              let name = values[index].name || 'Unidentified';
              name = name.length > 20 ? `${name.substring(0, 20)}...` : name;
              if (percentage < 3) {
                return null;
              }
              return (
                <text
                  x={x}
                  y={y}
                  fontWeight="400"
                  fontSize="12px"
                  textAnchor={x > cx ? 'start' : 'end'}
                  dominantBaseline="central"
                  fill="#666"
                >
                  {numberWithCommas(value)}
                </text>
              );
            }}
          >
            {values.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={Styles.safeColors[index % Styles.safeColors.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </NoContent>
  );
}

export default CustomMetricPieChart;
