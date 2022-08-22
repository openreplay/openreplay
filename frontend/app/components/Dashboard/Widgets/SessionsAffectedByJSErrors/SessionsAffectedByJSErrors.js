import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles, AvgLabel } from '../common';
import { 
  ComposedChart, Bar, CartesianGrid, Legend, ResponsiveContainer, 
  XAxis, YAxis, Tooltip
} from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';

const customParams = rangeName => {
  const params = { density: 28 }

  if (rangeName === LAST_24_HOURS) params.density = 28
  if (rangeName === LAST_30_MINUTES) params.density = 28
  if (rangeName === YESTERDAY) params.density = 28
  if (rangeName === LAST_7_DAYS) params.density = 28
  
  return params
}

@widgetHOC('impactedSessionsByJsErrors', { customParams })
export default class SessionsAffectedByJSErrors extends React.PureComponent {
  render() {
    const { data, loading, period, compare, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const params = customParams(period.rangeName)

    return (
      <React.Fragment>
        <div className="flex items-center mb-3">
          <div className="ml-auto">
            <AvgLabel text="Errors" count={data.errorsCount} />
          </div>
        </div>
        <Loader loading={ loading } size="small">
          <NoContent
            size="small"
            show={ data.chart.length === 0 }
            title="No recordings found"
          >
            <ResponsiveContainer height={ 207 } width="100%">
              <ComposedChart
                data={data.chart}
                margin={Styles.chartMargins}
                syncId={ showSync ? "impactedSessionsByJsErrors" : undefined }
              >
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis {...Styles.xaxis} dataKey="time" interval={params.density/7} />
                <YAxis
                  {...Styles.yaxis}
                  allowDecimals={false}
                  label={{  
                    ...Styles.axisLabelLeft,
                    value: "Number of Sessions"
                  }}
                />
                <Tooltip {...Styles.tooltip} />
                <Bar minPointSize={1} name="Sessions" dataKey="sessionsCount" stackId="a" fill={colors[0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </NoContent>
        </Loader>
      </React.Fragment>
    );
  }
}
