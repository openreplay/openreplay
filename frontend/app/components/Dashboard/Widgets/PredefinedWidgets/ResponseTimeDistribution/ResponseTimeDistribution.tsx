import React from 'react';
import { Loader, NoContent } from 'UI';
import { Styles, AvgLabel } from '../../common';
import { 
  ComposedChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, 
  XAxis, YAxis, ReferenceLine, Tooltip, Legend
} from 'recharts';
import { NO_METRIC_DATA } from 'App/constants/messages'


const PercentileLine = props => {
  const {
    viewBox: { x, y },
    xoffset,
    yheight,
    height,
    label
  } = props;
  return (
    <svg>
      <line
        x1={x + xoffset}
        x2={x + xoffset}
        y1={height + 10}
        y2={205}
        {...props}
      />
      <text
        x={x + 5}
        y={height + 20}
        fontSize="8"
        fontFamily="Roboto"
        fill="#000000"
        textAnchor="start"
      >
        {label}
      </text>
    </svg>
  );
};

interface Props {
    data: any
    metric?: any
}
function ResponseTimeDistribution(props: Props) {
    const { data, metric } = props;
    const colors = Styles.colors;

    return (
        <NoContent
          size="small"
          title={NO_METRIC_DATA}
          show={ metric.data.chart.length === 0 }
          style={ { height: '240px' } }
        >
          <div className="flex items-center justify-end mb-3">
            <AvgLabel text="Avg" unit="ms" className="ml-3" count={metric.data.value} />
          </div>
          <div className="flex mb-4">
            <ResponsiveContainer height={ 240 } width="100%">
                <ComposedChart
                  data={metric.data.chart}
                  margin={Styles.chartMargins}
                  barSize={50}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                  <XAxis
                    {...Styles.xaxis}
                    dataKey="responseTime"
                    label={{ 
                      ...Styles.axisLabelLeft,
                      angle: 0,
                      offset: 0,
                      value: "Page Response Time (ms)",
                      style: { textAnchor: 'middle' },
                      position: "insideBottom"
                    }}
                  />
                  <YAxis
                    {...Styles.yaxis}
                    allowDecimals={false}
                    label={{
                      ...Styles.axisLabelLeft,
                      value: "Number of Calls"
                    }}
                  />
                  <Bar minPointSize={1} name="Calls" dataKey="count" stackId="a" fill={colors[2]} label="Backend" />
                  <Tooltip {...Styles.tooltip} labelFormatter={val => 'Page Response Time: ' + val} />
                  { metric.data.percentiles.map((item, i) => (
                    <ReferenceLine
                      key={i}
                      label={
                        <PercentileLine
                          xoffset={0}
                          // y={130}
                          height={i * 20}
                          stroke={'#000'}
                          strokeWidth={0.5}
                          strokeOpacity={1}
                          label={`${item.percentile}th Percentile (${item.responseTime}ms)`}
                        />
                      }
                      // allowDecimals={false}
                      x={item.responseTime}
                      strokeWidth={0}
                      strokeOpacity={1}
                    />
                  ))}
                </ComposedChart>
            </ResponsiveContainer>
            <ResponsiveContainer height={ 240 } width="10%">
              <BarChart
                data={metric.data.extremeValues}
                margin={Styles.chartMargins}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis {...Styles.xaxis} dataKey="time" />
                <YAxis hide type="number" domain={[0, metric.data.total]} {...Styles.yaxis} allowDecimals={false} />
                <Tooltip {...Styles.tooltip} />
                <Bar minPointSize={1} name="Extreme Values" dataKey="count" stackId="a" fill={colors[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </NoContent>
    );
}

export default ResponseTimeDistribution;
