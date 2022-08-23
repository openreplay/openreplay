import React from 'react';
import { Loader, NoContent } from 'UI';
import { widgetHOC, Styles, AvgLabel } from '../common';
import { 
  ComposedChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, 
  XAxis, YAxis, ReferenceLine, Tooltip
} from 'recharts';
import { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';

const customParams = rangeName => {
  const params = { density: 40 }

  if (rangeName === LAST_24_HOURS) params.density = 40
  if (rangeName === LAST_30_MINUTES) params.density = 40
  if (rangeName === YESTERDAY) params.density = 40
  if (rangeName === LAST_7_DAYS) params.density = 40
  
  return params
}

const PercentileLine = props => {
  const {
    viewBox: { x, y },
    xoffset,
    yheight,
    height,
    label
  } = props;
  return (
    <svg>
      <line
        x1={x + xoffset}
        x2={x + xoffset}
        y1={height + 10}
        y2={172}
        {...props}
      />
      <text
        x={x + 5}
        y={height + 20}
        fontSize="8"
        fontFamily="Roboto"
        fill="#000000"
        textAnchor="start"
      >
        {label}
      </text>
    </svg>
  );
};

@widgetHOC('pagesResponseTimeDistribution', { customParams })
export default class ResponseTimeDistribution extends React.PureComponent {
  render() {
    const { data, loading, compare = false, showSync = false } = this.props;
    const colors = compare ? Styles.compareColors : Styles.colors;    

    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          show={ data.chart.length === 0 }
          title="No recordings found"
        >
          <div className="flex items-center justify-end mb-3">
            <AvgLabel text="Avg" unit="ms" className="ml-3" count={data.avg} />
          </div>
          <div className="flex">
            <ResponsiveContainer height={ 207 } width="100%">
              <ComposedChart
                data={data.chart}
                margin={Styles.chartMargins}
                syncId={ showSync ? "pagesResponseTimeDistribution" : undefined }
                barSize={50}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis
                  {...Styles.xaxis}
                  dataKey="responseTime"
                  label={{ 
                    ...Styles.axisLabelLeft,
                    angle: 0,
                    offset: 0,
                    value: "Page Response Time (ms)",
                    style: { textAnchor: 'middle' },
                    position: "insideBottom"
                  }}
                  dataKey="responseTime"
                />
                <YAxis
                  {...Styles.yaxis}
                  allowDecimals={false}
                  label={{
                    ...Styles.axisLabelLeft,
                    value: "Number of Calls"
                  }}
                />
                <Bar minPointSize={1} name="Calls" dataKey="count" stackId="a" fill={colors[2]} label="Backend" />
                <Tooltip {...Styles.tooltip} labelFormatter={val => 'Page Response Time: ' + val} />
                { data.percentiles.map((item, i) => (
                  <ReferenceLine
                    key={i}
                    label={
                      <PercentileLine
                        xoffset={0}
                        // y={130}
                        height={i * 20}
                        stroke={'#000'}
                        strokeWidth={0.5}
                        strokeOpacity={1}
                        label={`${item.percentile}th Percentile (${item.responseTime}ms)`}
                      />
                    }
                    allowDecimals={false}
                    x={item.responseTime}
                    strokeWidth={0}
                    strokeOpacity={1}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
            <ResponsiveContainer height={ 207 } width="10%">
              <BarChart
                data={data.extremeValues}
                margin={Styles.chartMargins}
                barSize={40}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis {...Styles.xaxis} dataKey="time" />
                <YAxis hide type="number" domain={[0, data.total]} {...Styles.yaxis} allowDecimals={false} />
                <Tooltip {...Styles.tooltip} />
                <Bar minPointSize={1} name="Extreme Values" dataKey="count" stackId="a" fill={colors[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </NoContent>
      </Loader>
    );
  }
}
