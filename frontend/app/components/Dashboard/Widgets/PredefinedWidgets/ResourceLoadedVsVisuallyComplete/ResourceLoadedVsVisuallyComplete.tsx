import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import { 
  ComposedChart, Bar, CartesianGrid, Line, Legend, ResponsiveContainer, 
  XAxis, YAxis, Tooltip
} from 'recharts';
import { NO_METRIC_DATA } from 'App/constants/messages';
import { InfoCircleOutlined } from '@ant-design/icons';

interface Props {
    data: any
    metric?: any
}
function ResourceLoadedVsVisuallyComplete(props: Props) {
    const { metric } = props;

    return (
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
          title={
            <div className='flex items-center gap-2 text-base font-normal'>
            <InfoCircleOutlined  size={12} /> { NO_METRIC_DATA }
        </div>
          }
        >
          <ResponsiveContainer height={ 240 } width="100%">
            <ComposedChart
                data={metric.data.chart}
                margin={ Styles.chartMargins}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis
                  {...Styles.xaxis}
                  dataKey="time"
                  interval={(metric.params.density / 7)}
                />
                <YAxis
                  {...Styles.yaxis}
                  label={{ ...Styles.axisLabelLeft, value: "Visually Complete (ms)" }}
                  yAxisId="left"
                  tickFormatter={val => Styles.tickFormatter(val, 'ms')}
                />
                <YAxis
                  {...Styles.yaxis}
                  label={{
                    ...Styles.axisLabelLeft,
                    value: "Number of Resources",
                    position: "insideRight",
                    offset: 0
                  }}
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={val => Styles.tickFormatter(val)}
                />
                <Tooltip {...Styles.tooltip} />
                <Legend  />
                <Bar minPointSize={1} yAxisId="right" name="Images" type="monotone" dataKey="types.img" stackId="a" fill={Styles.compareColors[0]} />
                <Bar yAxisId="right" name="Scripts" type="monotone" dataKey="types.script" stackId="a" fill={Styles.compareColors[1]} />
                <Bar yAxisId="right" name="CSS" type="monotone" dataKey="types.stylesheet" stackId="a" fill={Styles.compareColors[2]} />
                <Line
                  yAxisId="left"
                  name="Visually Complete"
                  type="monotone"
                  dataKey="avgTimeToRender"
                  stroke={Styles.strokeColor }
                  
                  dot={false}
                  unit=" ms"
                  strokeWidth={2}
                />
              </ComposedChart>
          </ResponsiveContainer>
        </NoContent>
    );
}

export default ResourceLoadedVsVisuallyComplete;
