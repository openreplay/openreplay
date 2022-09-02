//@ts-nocheck
import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import { 
    BarChart, Bar, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, 
    XAxis, YAxis
  } from 'recharts';
import { NO_METRIC_DATA } from 'App/constants/messages'

interface Props {
    data: any
    metric?: any
}
function ErrorsByOrigin(props: Props) {
    const { metric } = props;

    return (
        <NoContent
          size="small"
          title={NO_METRIC_DATA}
          show={ metric.data.chart.length === 0 }
          style={ { height: '240px' } }
        >
          <ResponsiveContainer height={ 240 } width="100%">
            <BarChart
              data={metric.data.chart}
              margin={Styles.chartMargins}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis
                {...Styles.xaxis}
                dataKey="time"
                interval={metric.params.density/7}
              />
              <YAxis
                {...Styles.yaxis}
                tickFormatter={val => Styles.tickFormatter(val)}
                label={{ ...Styles.axisLabelLeft, value: "Number of Errors" }}
                allowDecimals={false}
              />
              <Legend />
              <Tooltip {...Styles.tooltip} />
              <Bar minPointSize={1} name={<span className="float">1<sup>st</sup> Party</span>} dataKey="firstParty" stackId="a" fill={Styles.colors[0]} />
              <Bar name={<span className="float">3<sup>rd</sup> Party</span>} dataKey="thirdParty" stackId="a" fill={Styles.colors[2]} />
              {/* <Bar minPointSize={1} name={<span className="float">1<sup>st</sup> Party</span>} dataKey="firstParty" stackId="a" fill={Styles.colors[0]} />
              <Bar name={<span className="float">3<sup>rd</sup> Party</span>} dataKey="thirdParty" stackId="a" fill={Styles.colors[2]} /> */}
            </BarChart>
          </ResponsiveContainer>
        </NoContent>
    );
}

export default ErrorsByOrigin;
