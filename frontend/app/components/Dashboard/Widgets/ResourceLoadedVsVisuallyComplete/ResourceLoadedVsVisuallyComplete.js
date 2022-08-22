import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles } from '../common';
import { 
  ComposedChart, Bar, CartesianGrid, Line, Legend, ResponsiveContainer, 
  XAxis, YAxis, Tooltip
} from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';

const customParams = rangeName => {
  const params = { density: 21 }

  if (rangeName === LAST_24_HOURS) params.density = 21
  if (rangeName === LAST_30_MINUTES) params.density = 21
  if (rangeName === YESTERDAY) params.density = 21
  if (rangeName === LAST_7_DAYS) params.density = 21
  
  return params
}

@widgetHOC('resourcesVsVisuallyComplete', { customParams })
export default class ResourceLoadedVsVisuallyComplete extends React.PureComponent {
  render() {
    const {className, data, loading, period, compare = false, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const params = customParams(period.rangeName)

    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          title="No recordings found"
          show={ data.size === 0 }
        >
          <ResponsiveContainer height={ 240 } width="100%">
            <ComposedChart
              data={data.chart}
              margin={ Styles.chartMargins}
              syncId={ showSync ? "resourcesVsVisuallyComplete" : undefined }
            >
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis
                {...Styles.xaxis}
                dataKey="time"
                interval={3}
                interval={(params.density / 7)}
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
              <Legend />
              <Bar minPointSize={1} yAxisId="right" name="Images" type="monotone" dataKey="types.img" stackId="a" fill={colors[0]} />
              <Bar yAxisId="right" name="Scripts" type="monotone" dataKey="types.script" stackId="a" fill={colors[2]} />
              <Bar yAxisId="right" name="CSS" type="monotone" dataKey="types.stylesheet" stackId="a" fill={colors[4]} />
              <Line
                yAxisId="left"
                name="Visually Complete"
                type="monotone"
                dataKey="avgTimeToRender"
                stroke={compare? Styles.lineColorCompare : Styles.lineColor }
                dot={false}
                unit=" ms"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </NoContent>
      </Loader>
    );
  }
}
