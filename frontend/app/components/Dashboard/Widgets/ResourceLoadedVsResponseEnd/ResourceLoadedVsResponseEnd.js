import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles } from '../common';
import { ComposedChart, Bar, CartesianGrid, Line, Legend, ResponsiveContainer, 
  XAxis, YAxis, Tooltip
} from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';

const customParams = rangeName => {
  const params = { density: 30 }

  if (rangeName === LAST_24_HOURS) params.density = 24
  if (rangeName === LAST_30_MINUTES) params.density = 18
  if (rangeName === YESTERDAY) params.density = 24
  if (rangeName === LAST_7_DAYS) params.density = 30
  
  return params
}

@widgetHOC('resourceTypeVsResponseEnd', { customParams })
export default class ResourceLoadedVsResponseEnd extends React.PureComponent {
  render() {
    const { data, loading, compare = false, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    
    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          show={ data.chart.length === 0 }
          title="No recordings found"
        >
          <ResponsiveContainer height={ 247 } width="100%">
            <ComposedChart
              data={data.chart}
              margin={Styles.chartMargins}
              syncId={ showSync ? "resourceTypeVsResponseEnd" : undefined }
            >
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis {...Styles.xaxis} dataKey="time" interval={7} />
              <YAxis
                {...Styles.yaxis}
                label={{ ...Styles.axisLabelLeft, value: "Number of Resources" }}
                tickFormatter={val => Styles.tickFormatter(val, 'ms')}
                yAxisId="left"
              />
              <YAxis
                {...Styles.yaxis}
                tickFormatter={val => Styles.tickFormatter(val, 'ms')}
                label={{
                  ...Styles.axisLabelLeft,
                  offset: 70,
                  value: "Response End (ms)"
                }}
                yAxisId="right"
                orientation="right"
              />
              <Legend />
              <Tooltip {...Styles.tooltip} />
              <Bar minPointSize={1} yAxisId="left" name="XHR" dataKey="xhr" stackId="a" fill={colors[0]} />
              <Bar yAxisId="left" name="Other" dataKey="total" stackId="a" fill={colors[2]} />
              <Line
                yAxisId="right"
                strokeWidth={2}
                name="Response End"
                type="monotone"
                dataKey="avgResponseEnd"
                stroke={compare ? Styles.lineColorCompare : Styles.lineColor}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </NoContent>
      </Loader>
    );
  }
}
