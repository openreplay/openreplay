import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import { numberWithCommas } from 'App/utils';
import Bar from 'App/components/Dashboard/Widgets/SlowestDomains/Bar';

interface Props {
    data: any
}
function SlowestDomains(props: Props) {
    const { data } = props;
    const firstAvg = data.chart[0] && data.chart[0].errorsCount;
    return (
        <NoContent
          size="small"
          show={ data.chart.length === 0 }
        >
          <div className="w-full" style={{ height: '240px' }}>
            {data.chart.map((item, i) => 
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

export default SlowestDomains;