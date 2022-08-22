import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import Bar from './Bar';
import { NO_METRIC_DATA } from 'App/constants/messages'

interface Props {
    data: any
    metric?: any
}
function SessionsPerBrowser(props: Props) {
    const { data, metric } = props;
    const firstAvg = metric.data.chart[0] && metric.data.chart[0].count;

    const getVersions = item => {
      return Object.keys(item)
        .filter(i => i !== 'browser' && i !== 'count' && i !== 'time' && i !== 'timestamp')
        .map(i => ({ key: 'v' +i, value: item[i]}))
    }
    return (
        <NoContent
          size="small"
          title={NO_METRIC_DATA}
          show={ metric.data.chart.length === 0 }
          style={{ minHeight: 220 }}
        >
          <div className="w-full" style={{ height: '240px' }}>
            {metric.data.chart.map((item, i) => 
              <Bar
                key={i}
                className="mb-4"
                avg={Math.round(item.count)}
                versions={getVersions(item)}
                width={Math.round((item.count * 100) / firstAvg) - 10}
                domain={item.browser}
                colors={Styles.colors}
              />
            )}
          </div>
        </NoContent>
    );
}

export default SessionsPerBrowser;
