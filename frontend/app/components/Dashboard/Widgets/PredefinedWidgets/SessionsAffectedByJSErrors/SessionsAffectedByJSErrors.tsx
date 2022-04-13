import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import { 
    BarChart, Bar, CartesianGrid, Tooltip,
    LineChart, Line, Legend, ResponsiveContainer, 
    XAxis, YAxis
  } from 'recharts';

interface Props {
    data: any
    metric?: any
}
function SessionsAffectedByJSErrors(props: Props) {
    const { data, metric } = props;
    return (
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
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
                label={{ ...Styles.axisLabelLeft, value: "Number of Errors" }}
                allowDecimals={false}
              />
              <Legend />
              <Tooltip {...Styles.tooltip} />
              <Bar minPointSize={1} name="Sessions" dataKey="sessionsCount" stackId="a" fill={Styles.colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        </NoContent>
    );
}

export default SessionsAffectedByJSErrors;