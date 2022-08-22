import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles } from '../common';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, 
  LineChart, Line, Legend, Tooltip
} from 'recharts';

@widgetHOC('domainsErrors', { fitContent: true })
export default class TopDomains extends React.PureComponent {
  render() {
    const { data, loading, key = '4xx' } = this.props;
  
    const namesMap = data.chart[key]
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
          show={ data.chart.length === 0 }
          title="No recordings found"
        >
          <ResponsiveContainer height={ 240 } width="100%">
            <LineChart
              data={ data.chart[key] }
              margin={Styles.chartMargins}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A8E0DA" stopOpacity={ 0.9 } />
                  <stop offset="95%" stopColor="#A8E0DA" stopOpacity={ 0.2 } />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis
                {...Styles.xaxis} dataKey="time"
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
                <Line name={key} type="monotone" dataKey={key} stroke={Styles.colors[index]} fillOpacity={ 1 } strokeWidth={ 2 } strokeOpacity={ 0.8 } fill="url(#colorCount)" dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </NoContent>
      </Loader>
    );
  }
}
