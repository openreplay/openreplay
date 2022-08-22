import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import { numberWithCommas } from 'App/utils';
import Bar from 'App/components/Dashboard/Widgets/ErrorsPerDomain/Bar';
import { NO_METRIC_DATA } from 'App/constants/messages'

interface Props {
    data: any
    metric?: any
}
function ErrorsPerDomain(props: Props) {
    const { data, metric } = props;
    // const firstAvg = 10;
    const firstAvg = metric.data.chart[0] && metric.data.chart[0].errorsCount;
    return (
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
          style={{ height: '240px'}}
          title={NO_METRIC_DATA}
        >
          <div className="w-full" style={{ height: '240px' }}>
            {metric.data.chart.map((item, i) => 
              <Bar
                key={i}
                className="mb-2"
                avg={numberWithCommas(Math.round(item.errorsCount))}
                width={Math.round((item.errorsCount * 100) / firstAvg) - 10}
                domain={item.domain}
                color={Styles.colors[i]}
              />
            )}
          </div>
        </NoContent>
    );
}

export default ErrorsPerDomain;
