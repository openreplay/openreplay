import React from 'react';
import { NoContent, Icon } from 'UI';
import { Styles } from '../../common';
import { 
    BarChart, Bar, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer,
    XAxis, YAxis
  } from 'recharts';

interface Props {
    data: any
    metric?: any
}
function BreakdownOfLoadedResources(props: Props) {
    const { data, metric } = props;
    const gradientDef = Styles.gradientDef();

    return (
        <NoContent
          size="small"
          title={
            <div className="flex items-center">
              <Icon name="info-circle" className="mr-2" size="14" />
              No data available for the selected period.
            </div>
          }
          show={ metric.data.chart && metric.data.chart.length === 0 }
        >
          <ResponsiveContainer height={ 240 } width="100%">
              <BarChart
                data={ metric.data.chart }
                margin={ Styles.chartMargins }
              >
                {gradientDef}
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis {...Styles.xaxis} dataKey="time" interval={metric.params.density/7} />
                <YAxis
                  {...Styles.yaxis}
                  allowDecimals={false}
                  label={{ ...Styles.axisLabelLeft, value: "Number of Resources" }}
                  tickFormatter={val => Styles.tickFormatter(val)}
                />
                <Legend />
                <Tooltip {...Styles.tooltip} />
                <Bar minPointSize={1} name="CSS" dataKey="stylesheet" stackId="a" fill={Styles.compareColors[0]} />
                <Bar name="Images" dataKey="img" stackId="a" fill={Styles.compareColors[1]} />
                <Bar name="Scripts" dataKey="script" stackId="a" fill={Styles.compareColors[2]} />
              </BarChart>
          </ResponsiveContainer>
        </NoContent>
    );
}

export default BreakdownOfLoadedResources;
