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
}
function ErrorsByType(props: Props) {
    const { data } = props;
    return (
        <NoContent
          size="small"
          show={ data.chart.length === 0 }
        >
          <ResponsiveContainer height={ 240 } width="100%">
            <BarChart
              data={data.chart}
              margin={Styles.chartMargins}
              syncId="errorsPerType"
            //   syncId={ showSync ? "errorsPerType" : undefined }
            >
              <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
              <XAxis
                {...Styles.xaxis}
                dataKey="time"
                // interval={params.density/7}
              />
              <YAxis
                {...Styles.yaxis}
                label={{ ...Styles.axisLabelLeft, value: "Number of Errors" }}
                allowDecimals={false}
              />
              <Legend />
              <Tooltip {...Styles.tooltip} />
              <Bar minPointSize={1} name="Integrations" dataKey="integrations" stackId="a" fill={Styles.colors[0]}/>
              <Bar name="4xx" dataKey="4xx" stackId="a" fill={Styles.colors[1]} />
              <Bar name="5xx" dataKey="5xx" stackId="a" fill={Styles.colors[2]} />
              <Bar name="Javascript" dataKey="js" stackId="a" fill={Styles.colors[3]} />
            </BarChart>
          </ResponsiveContainer>
        </NoContent>
    );
}

export default ErrorsByType;