import React from 'react';
import { NoContent } from 'UI';
import { Styles, AvgLabel } from '../../common';
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
function MemoryConsumption(props: Props) {
    const { data, metric } = props;
    const gradientDef = Styles.gradientDef();

    return (
        <NoContent
          size="small"
          show={ metric.data.chart.length === 0 }
        >
          <>
            <div className="flex items-center justify-end mb-3">
              <AvgLabel text="Avg" unit="mb" className="ml-3" count={data.avgUsedJsHeapSize} />
            </div>
            <ResponsiveContainer height={ 207 } width="100%">
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
                    label={{ ...Styles.axisLabelLeft, value: "JS Heap Size (mb)" }}
                  />
                  <Tooltip {...Styles.tooltip} />
                  <Area
                    name="Avg"
                    unit=" mb"
                    type="monotone"
                    dataKey="value"
                    stroke={Styles.colors[0]}
                    fillOpacity={ 1 }
                    strokeWidth={ 2 }
                    strokeOpacity={ 0.8 }
                    fill={'url(#colorCount)'}
                  />
                </AreaChart>
            </ResponsiveContainer>
          </>
        </NoContent>
    );
}

export default MemoryConsumption;