import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import { 
  ComposedChart, Bar, CartesianGrid, Line, Legend, ResponsiveContainer, 
  XAxis, YAxis, Tooltip
} from 'recharts';
import { NO_METRIC_DATA } from 'App/constants/messages'

interface Props {
    data: any
    metric?: any
}
function ResourceLoadedVsResponseEnd(props: Props) {
    const { data, metric } = props;

    return (
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
          title={NO_METRIC_DATA}
        >
          <ResponsiveContainer height={ 246 } width="100%">
            <ComposedChart
                data={metric.data.chart}
                margin={ Styles.chartMargins}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis
                  {...Styles.xaxis}
                  dataKey="time"
                  // interval={3}
                  interval={(metric.params.density / 7)}
                />
                <YAxis
                  {...Styles.yaxis}
                  label={{ ...Styles.axisLabelLeft, value: "Number of Resources" }}
                  yAxisId="left"
                  tickFormatter={val => Styles.tickFormatter(val, 'ms')}
                />
                <YAxis
                  {...Styles.yaxis}
                  label={{
                    ...Styles.axisLabelLeft,
                    value: "Response End (ms)",
                    position: "insideRight",
                    offset: 0
                  }}
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={val => Styles.tickFormatter(val, 'ms')}
                />
                <Tooltip {...Styles.tooltip} />
                <Legend />
                <Bar minPointSize={1} yAxisId="left" name="XHR" dataKey="xhr" stackId="a" fill={Styles.colors[0]} />
                <Bar yAxisId="left" name="Other" dataKey="total" stackId="a" fill={Styles.colors[2]} />
                <Line
                  yAxisId="right"
                  strokeWidth={2}
                  name="Response End"
                  type="monotone"
                  dataKey="avgResponseEnd"
                  stroke={Styles.lineColor}
                  dot={false}
                />
              </ComposedChart>
          </ResponsiveContainer>
        </NoContent>
    );
}

export default ResourceLoadedVsResponseEnd;
