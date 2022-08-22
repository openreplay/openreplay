import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles } from '../common';
import Bar from './Bar';
import { numberWithCommas } from 'App/utils';

@widgetHOC('slowestDomains')
export default class ResponseTime extends React.PureComponent {  
  render() {
    const { data, loading, compare = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const firstAvg = data.partition.first() && data.partition.first().avg;
    
    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          show={ data.partition && data.partition.size === 0 }
          title="No recordings found"
        >          
          <div className="w-full pt-3" style={{ height: '240px' }}>
            {data.partition && data.partition.map((item, i) => 
              <Bar className="mb-4"
                avg={numberWithCommas(Math.round(item.avg))}
                width={Math.round((item.avg * 100) / firstAvg) - 20}
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
