import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, AvgLabel, Styles } from '../common';
import Bar from './Bar';

@widgetHOC('sessionsPerBrowser')
export default class SessionsPerBrowser extends React.PureComponent {  

  getVersions = item => {
    return Object.keys(item)
      .filter(i => i !== 'browser' && i !== 'count')
      .map(i => ({ key: 'v' +i, value: item[i]}))
  }

  render() {
    const { data, loading, compare = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const firstAvg = data.chart[0] && data.chart[0].count;
    
    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          show={ data.chart.size === 0 }
          title="No recordings found"
        >          
          <div className="w-full pt-3" style={{ height: '240px' }}>
            {data.chart.map((item, i) => 
              <Bar
                key={i}
                className="mb-4"
                avg={Math.round(item.count)}
                versions={this.getVersions(item)}
                width={Math.round((item.count * 100) / firstAvg) - 10}
                domain={item.browser}
                colors={colors}
              />
            )}
          </div>
        </NoContent>
      </Loader>
    );
  }
}
