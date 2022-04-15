import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import { numberWithCommas } from 'App/utils';
import Bar from 'App/components/Dashboard/Widgets/ErrorsPerDomain/Bar';

interface Props {
    data: any
    metric?: any
}
function SessionsPerBrowser(props: Props) {
    const { data, metric } = props;
    const firstAvg = metric.data.chart[0] && metric.data.chart[0].count;

    const getVersions = item => {
      return Object.keys(item)
        .filter(i => i !== 'browser' && i !== 'count')
        .map(i => ({ key: 'v' +i, value: item[i]}))
    }
    return (
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
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