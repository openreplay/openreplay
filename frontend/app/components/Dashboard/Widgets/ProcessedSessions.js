import React from 'react';
import { ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area } from 'recharts';
import { Loader } from 'UI';
import { CountBadge, domain, widgetHOC, Styles } from './common';

@widgetHOC('sessions', { trendChart: true, fitContent: true })
export default class ProcessedSessions extends React.PureComponent {
  render() {
    const { data, loading } = this.props;
    const isMoreThanK = data.count > 1000;
    const countView = isMoreThanK ? Math.trunc(data.count / 1000) : data.count;

    return (
      <div className="flex justify-between items-center flex-1">
        <Loader loading={ loading } size="small">
          <CountBadge
            className="absolute top-0 pl-4"
            title="New and Returning Visitors"
            count={ countView }
            change={ data.progress }
            unit={ isMoreThanK ? 'k' : '' }
          />
          <ResponsiveContainer height={ 90 } width="100%">
            <AreaChart
              data={ data.chart }
              margin={ {
                top: 40, right: 0, left: 0, bottom: -10,
              } }
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A8E0DA" stopOpacity={ 0.9 } />
                  <stop offset="95%" stopColor="#A8E0DA" stopOpacity={ 0.2 } />
                </linearGradient>
              </defs>
              <XAxis {...Styles.xaxis} dataKey="time" />
              <YAxis hide interval={ 0 }  domain={ domain } />
              <Area type="monotone" dataKey="count" stroke={Styles.strokeColor} fillOpacity={ 1 } strokeWidth={ 2 } strokeOpacity={ 0.8 } fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </Loader>
      </div>
    );
  }
}
