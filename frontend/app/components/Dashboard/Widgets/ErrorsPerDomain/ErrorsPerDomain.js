import React from 'react';
import { Loader, NoContent } from 'UI';
import { Table, widgetHOC, domain, AvgLabel, Styles } from '../common';
import Bar from './Bar';
import { numberWithCommas } from 'App/utils';

@widgetHOC('errorsPerDomains')
export default class ErrorsPerDomain extends React.PureComponent {  
  render() {
    const { data, loading, compare = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const firstAvg = data.first() && data.first().errorsCount;
    
    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          title="No recordings found"
          show={ data.size === 0 }
        >          
          <div className="w-full pt-3" style={{ height: '240px' }}>
            {data.map((item, i) => 
              <Bar
                key={i}
                className="mb-4"
                avg={numberWithCommas(Math.round(item.errorsCount))}
                width={Math.round((item.errorsCount * 100) / firstAvg) - 10}
                domain={item.domain}
                color={colors[i]}
              />
            )}
          </div>
        </NoContent>
      </Loader>
    );
  }
}
