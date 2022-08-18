import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles } from '../common';
import { 
  AreaChart, Area, ResponsiveContainer, 
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';

const customParams = rangeName => {
  const params = { density: 70 }

  if (rangeName === LAST_24_HOURS) params.density = 70
  if (rangeName === LAST_30_MINUTES) params.density = 70
  if (rangeName === YESTERDAY) params.density = 70
  if (rangeName === LAST_7_DAYS) params.density = 70
  
  return params
}

@widgetHOC('crashes', { customParams })
export default class Crashes extends React.PureComponent {
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
          <ResponsiveContainer height={ 240 } width="100%">
            <AreaChart
              data={ data.chart }
              margin={ Styles.chartMargins }
              syncId={ showSync ? "crashes" : undefined }
            >
              {gradientDef}
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis {...Styles.xaxis} dataKey="time" interval={(params.density/7)} />
              <YAxis
                {...Styles.yaxis}
                allowDecimals={false}
                tickFormatter={val => Styles.tickFormatter(val)}
                label={{ ...Styles.axisLabelLeft, value: "Number of Crashes" }}
              />
              <Tooltip {...Styles.tooltip} />
              <Area
                name="Crashes"
                type="monotone"
                dataKey="count"
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
