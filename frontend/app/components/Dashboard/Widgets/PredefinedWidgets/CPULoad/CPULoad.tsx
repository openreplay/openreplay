import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import { 
    AreaChart, Area,
    BarChart, Bar, CartesianGrid, Tooltip,
    LineChart, Line, Legend, ResponsiveContainer, 
    XAxis, YAxis
  } from 'recharts';

interface Props {
    data: any
    metric?: any
}
function CPULoad(props: Props) {
    const { data, metric } = props;
    const gradientDef = Styles.gradientDef();

    return (
        <NoContent
          size="small"
          title="No data available"
          show={ metric.data.chart.length === 0 }
          style={ { height: '240px' } }
        >
          <ResponsiveContainer height={ 240 } width="100%">
            <AreaChart
                data={ metric.data.chart }
                margin={ Styles.chartMargins }
              >
                {gradientDef}
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis {...Styles.xaxis} dataKey="time" interval={(metric.params.density/7)} />
                <YAxis
                  {...Styles.yaxis}
                  allowDecimals={false}
                  tickFormatter={val => Styles.tickFormatter(val)}
                  label={{ ...Styles.axisLabelLeft, value: "CPU Load (%)" }}
                />
                <Tooltip {...Styles.tooltip} />
                <Area
                  name="Avg"
                  type="monotone"
                  unit="%"
                  dataKey="value"
                  stroke={Styles.strokeColor}
                  fillOpacity={ 1 }
                  strokeWidth={ 2 }
                  strokeOpacity={ 0.8 }
                  fill={'url(#colorCount)'}
                />
              </AreaChart>
          </ResponsiveContainer>
        </NoContent>
    );
}

export default CPULoad;
