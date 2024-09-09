import React from 'react'
import {Styles} from '../../common';
import {ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip} from 'recharts';
import {LineChart, Line, Legend} from 'recharts';

interface Props {
    data: any;
    params: any;
    // seriesMap: any;
    colors: any;
    onClick?: (event, index) => void;
    yaxis?: any;
    label?: string;
    hideLegend?: boolean;
}

function CustomMetricLineChart(props: Props) {
    const {
        data = {chart: [], namesMap: []},
        params,
        colors,
        onClick = () => null,
        yaxis = {...Styles.yaxis},
        label = 'Number of Sessions',
        hideLegend = false,
    } = props;

    return (
        <ResponsiveContainer height={240} width="100%">
            <LineChart
                data={data.chart}
                margin={Styles.chartMargins}
                // syncId={ showSync ? "domainsErrors_4xx" : undefined }
                onClick={onClick}
                // isAnimationActive={ false }
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE"/>
                <XAxis
                    {...Styles.xaxis}
                    dataKey="time"
                    interval={params.density / 7}
                />
                <YAxis
                    {...yaxis}
                    allowDecimals={false}
                    tickFormatter={val => Styles.tickFormatter(val)}
                    label={{
                        ...Styles.axisLabelLeft,
                        value: label || "Number of Sessions"
                    }}
                />
                {!hideLegend && <Legend />}
                <Tooltip {...Styles.tooltip} />
                {Array.isArray(data.namesMap) && data.namesMap.map((key, index) => (
                    <Line
                        key={key}
                        name={key}
                        type="monotone"
                        dataKey={key}
                        stroke={colors[index]}
                        fillOpacity={1}
                        strokeWidth={2}
                        strokeOpacity={key === 'Total' ? 0 : 0.6}
                        // fill="url(#colorCount)"
                        legendType={key === 'Total' ? 'none' : 'line'}
                        dot={false}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )
}

export default CustomMetricLineChart
