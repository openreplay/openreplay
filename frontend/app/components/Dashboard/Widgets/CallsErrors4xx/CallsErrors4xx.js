import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles } from '../common';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, 
  LineChart, Line, Legend, Tooltip
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

@widgetHOC('domainsErrors_4xx', { customParams })
export default class CallsErrors4xx extends React.PureComponent {
  render() {
    const { data, loading, period, compare = false, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const params = customParams(period.rangeName)
  
    const namesMap = data.chart
      .map(i => Object.keys(i))
      .flat()
      .filter(i => i !== 'time' && i !== 'timestamp')
      .reduce(
        (unique, item) => (unique.includes(item) ? unique : [...unique, item]),
        []
      );

    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          title="No recordings found"
          show={ data.chart.length === 0 }
        >
          <ResponsiveContainer height={ 240 } width="100%">
            <LineChart
              data={ data.chart }
              margin={Styles.chartMargins}
              syncId={ showSync ? "domainsErrors_4xx" : undefined }
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[4]} stopOpacity={ 0.9 } />
                  <stop offset="95%" stopColor={colors[4]} stopOpacity={ 0.2 } />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis
                {...Styles.xaxis}
                dataKey="time"
                interval={params.density/7}
              />
              <YAxis 
                {...Styles.yaxis}
                allowDecimals={false}
                label={{  
                  ...Styles.axisLabelLeft,
                  value: "Number of Errors"
                }}
              />
              <Legend />
              <Tooltip {...Styles.tooltip} />
              { namesMap.map((key, index) => (
                <Line key={key} name={key} type="monotone" dataKey={key} stroke={colors[index]} fillOpacity={ 1 } strokeWidth={ 2 } strokeOpacity={ 0.8 } fill="url(#colorCount)" dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </NoContent>
      </Loader>
    );
  }
}
