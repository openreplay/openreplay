import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles, AvgLabel } from '../common';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, AreaChart, Area, Tooltip } from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';

const customParams = rangeName => {
  const params = { density: 70 }

  if (rangeName === LAST_24_HOURS) params.density = 70
  if (rangeName === LAST_30_MINUTES) params.density = 70
  if (rangeName === YESTERDAY) params.density = 70
  if (rangeName === LAST_7_DAYS) params.density = 70
  
  return params
}

@widgetHOC('cpu', { customParams })
export default class CpuLoad extends React.PureComponent {
  render() {
    const { data, loading, period, compare = false, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const params = customParams(period.rangeName)
    const gradientDef = Styles.gradientDef();

    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          title="No recordings found"
          show={ data.chart.length === 0 }
        >
          <div className="flex items-center justify-end mb-3">
            <AvgLabel text="Avg" unit="%" className="ml-3" count={data.avgCpu} />
          </div>
          <ResponsiveContainer height={ 207 } width="100%">
            <AreaChart
              data={ data.chart }
              margin={ Styles.chartMargins }
              syncId={ showSync ? "cpu" : undefined }
            >
              {gradientDef}
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis {...Styles.xaxis} dataKey="time" interval={params.density/7} />
              <YAxis
                {...Styles.yaxis}
                allowDecimals={false}
                tickFormatter={val => Styles.tickFormatter(val)}
                label={{ ...Styles.axisLabelLeft, value: "CPU Load (%)" }}
              />
              <Tooltip {...Styles.tooltip} />
              <Area
                name="Avg"
                type="monotone"
                unit="%"
                dataKey="avgCpu"
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
