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
function CallsErrors4xx(props: Props) {
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
              {/* { data.namesMap.map((key, index) => (
                <Line key={key} name={key} type="monotone" dataKey={key} stroke={Styles.colors[index]} fillOpacity={ 1 } strokeWidth={ 2 } strokeOpacity={ 0.8 } fill="url(#colorCount)" dot={false} />
              ))} */}
            </BarChart>
          </ResponsiveContainer>
        </NoContent>
    );
}

export default CallsErrors4xx;