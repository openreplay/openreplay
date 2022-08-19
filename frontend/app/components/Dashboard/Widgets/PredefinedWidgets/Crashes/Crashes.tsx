import React from 'react';
import { NoContent } from 'UI';
import { Styles } from '../../common';
import { 
    AreaChart, Area,
    BarChart, Bar, CartesianGrid, Tooltip,
    LineChart, Line, Legend, ResponsiveContainer, 
    XAxis, YAxis
  } from 'recharts';
import { NO_METRIC_DATA } from 'App/constants/messages'

interface Props {
    data: any
    metric?: any
}
function Crashes(props: Props) {
    const { data, metric } = props;
    const gradientDef = Styles.gradientDef();
    return (
        <NoContent
          size="small"
          title={NO_METRIC_DATA}
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
                  label={{ ...Styles.axisLabelLeft, value: "Number of Crashes" }}
                />
                <Tooltip {...Styles.tooltip} />
                <Area
                  name="Crashes"
                  type="monotone"
                  dataKey="count"
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

export default Crashes;
