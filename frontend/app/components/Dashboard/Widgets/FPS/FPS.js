import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles, AvgLabel } from '../common';
import { ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';

const customParams = rangeName => {
  const params = { density: 70 }

  if (rangeName === LAST_24_HOURS) params.density = 70
  if (rangeName === LAST_30_MINUTES) params.density = 70
  if (rangeName === YESTERDAY) params.density = 70
  if (rangeName === LAST_7_DAYS) params.density = 70
  
  return params
}

@widgetHOC('fps', { customParams })
export default class FPS extends React.PureComponent {
  render() {
    const { data, loading, period, compare = false, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const params = customParams(period.rangeName)
    const gradientDef = Styles.gradientDef();

    return (
      <Loader loading={ loading } size="small">
        <NoContent
          title="No recordings found"
          size="small"
          show={ data.chart.length === 0 }
        >
          <div className="flex items-center justify-end mb-3">
            <AvgLabel text="Avg" className="ml-3" count={data.avgFps} />
          </div>
          <ResponsiveContainer height={ 207 } width="100%">
            <AreaChart
              data={ data.chart }
              margin={ Styles.chartMargins }
              syncId={ showSync ? "fps" : undefined }
            >
              {gradientDef}
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis {...Styles.xaxis} dataKey="time" interval={params.density/7} />
              <YAxis
                {...Styles.yaxis}
                allowDecimals={false}
                tickFormatter={val => Styles.tickFormatter(val)}
                label={{ ...Styles.axisLabelLeft, value: "Frames Per Second" }}
              />
              <Tooltip {...Styles.tooltip} />
              <Area
                name="Avg"
                type="monotone"
                dataKey="avgFps"
                stroke={colors[0]}
                fillOpacity={ 1 }
                strokeWidth={ 2 }
                strokeOpacity={ 0.8 }
                fill={compare ? 'url(#colorCountCompare)' : 'url(#colorCount)'}
              />
            </AreaChart>
          </ResponsiveContainer>
        </NoContent>
      </Loader>
    );
  }
}
