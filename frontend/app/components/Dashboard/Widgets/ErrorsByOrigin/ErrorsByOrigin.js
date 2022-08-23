import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles } from '../common';
import { 
  BarChart, Bar, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  XAxis, YAxis
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

@widgetHOC('resourcesByParty', { fullwidth: true, customParams })
export default class ErrorsByOrigin extends React.PureComponent {
  render() {
    const { data, loading, period, compare = false, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;
    const params = customParams(period.rangeName)

    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          title="No recordings found"
          show={ data.chart.length === 0 }
        >
          <ResponsiveContainer height={ 240 } width="100%">
            <BarChart
              data={data.chart}
              margin={Styles.chartMargins}
              syncId={ showSync ? "resourcesByParty" : undefined }
            >
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis {...Styles.xaxis} dataKey="time" interval={params.density/7} />
              <YAxis
                {...Styles.yaxis}
                label={{ ...Styles.axisLabelLeft, value: "Number of Errors" }}
                allowDecimals={false}
              />
              <Legend />
              <Tooltip {...Styles.tooltip} />
              <Bar minPointSize={1} name={<span className="float">1<sup>st</sup> Party</span>} dataKey="firstParty" stackId="a" fill={colors[0]} />
              <Bar name={<span className="float">3<sup>rd</sup> Party</span>} dataKey="thirdParty" stackId="a" fill={colors[2]} />
            </BarChart>
          </ResponsiveContainer>
        </NoContent>
      </Loader>
    );
  }
}
