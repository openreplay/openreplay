import React, { useState } from 'react';
import CustomTooltip from "../CustomChartTooltip";
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
import { observer } from 'mobx-react-lite';

interface Props {
  data: any;
  compData: any | null;
  params: any;
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
  inGrid?: boolean;
}

function CustomMetricLineChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    compData = { chart: [], namesMap: [] },
    colors,
    onClick = () => null,
    yaxis = { ...Styles.yaxis },
    label = 'Number of Sessions',
    hideLegend = false,
    inGrid,
  } = props;

  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);

  const handleMouseOver = (key) => () => {
    setHoveredSeries(key);
  };

  const handleMouseLeave = () => {
    setHoveredSeries(null);
  };

  // const resultChart = data.chart.map((item, i) => {
  //   if (compData && compData.chart[i]) return { ...compData.chart[i], ...item };
  //   return item;
  // });

  const resultChart = data.chart.map((item, i) => {
    if (compData && compData.chart[i]) {
      const comparisonItem: Record<string, any> = {};
      Object.keys(compData.chart[i]).forEach(key => {
        if (key !== 'time') {
          comparisonItem[`${key}_comparison`] = (compData.chart[i] as any)[key];
        }
      });
      return { ...item, ...comparisonItem };
    }
    return item;
  });

  

  return (
    <ResponsiveContainer height={240} width="100%">
      <LineChart
        data={resultChart}
        margin={Styles.chartMargins}
        onClick={onClick}
        onMouseLeave={handleMouseLeave}
      >
        {!hideLegend && (
          <Legend wrapperStyle={{ top: inGrid ? undefined : -18 }}
          payload={
            (data.namesMap as string[]).map((key: string, index: number) => ({
              value: key,
              type: 'line',
              color: colors[index],
              id: key,
            }))
          }
          />
        )}
        <CartesianGrid strokeDasharray="1 3" vertical={false} stroke="rgba(0,0,0,.15)" />
        <XAxis {...Styles.xaxis} dataKey="time" interval={'equidistantPreserveStart'} />
        <YAxis
          {...yaxis}
          allowDecimals={false}
          tickFormatter={(val) => Styles.tickFormatter(val)}
          label={{ ...Styles.axisLabelLeft, value: label || 'Number of Sessions' }}
        />
        <Tooltip {...Styles.tooltip} content={<CustomTooltip hoveredSeries={hoveredSeries} />} />
        
        {Array.isArray(data.namesMap) &&
          data.namesMap.map((key, index) =>
            key ? (
              <Line
                key={key}
                name={key}
                type="linear"
                dataKey={key}
                stroke={colors[index]}
                fillOpacity={1}
                strokeWidth={2}
                strokeOpacity={hoveredSeries && hoveredSeries !== key ? 0.2 : 1}
                legendType={key === 'Total' ? 'none' : 'line'}
                dot={false}
                activeDot={
                  hoveredSeries === key
                    ? {
                        r: 8, 
                        stroke: '#fff', 
                        strokeWidth: 2, 
                        fill: colors[index],
                        filter: 'drop-shadow(0px 0px 1px rgba(0, 0, 0, 0.2))', 
                      }
                    : false
                }
                onMouseOver={handleMouseOver(key)}
                style={{ cursor: 'pointer' }}
                animationDuration={1000}       
                animationEasing="ease-in-out"
                
              />
            ) : null
          )}
        
        {compData?.namesMap?.map((key, i) =>
          data.namesMap[i] ? (
            <Line
                key={key}
                name={`${key} (Comparison)`}
                type="linear"               
                dataKey={`${key}_comparison`}
                stroke={colors[i]}
                fillOpacity={1}
                strokeWidth={2}
                strokeOpacity={0.6}           
                legendType="line"
                dot={false}
                strokeDasharray="4 2"   
                onMouseOver={handleMouseOver(`${key} (Comparison)`)}      
                activeDot={
                  hoveredSeries === `${key} (Comparison)`
                    ? {
                        r: 8,
                        stroke: '#fff',
                        strokeWidth: 2,
                        fill: colors[i],
                        filter: 'drop-shadow(0px 0px 0px rgba(0, 0, 0, 0.2))',
                      }
                    : false
                }
                style={{ cursor: 'pointer' }}
                animationDuration={1000}      
                animationEasing="ease-in-out" 
              />
          ) : null
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default observer(CustomMetricLineChart);