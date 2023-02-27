import React from 'react'
import { Styles } from '../../common';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { LineChart, Line, Legend } from 'recharts';

interface Props {
    data: any;
    params: any;
    // seriesMap: any;
    colors: any;
    onClick?: (event, index) => void;
}
function CustomMetriLineChart(props: Props) {
    const { data = { chart: [], namesMap: [] }, params, colors, onClick = () => null } = props;

    return (
        <ResponsiveContainer height={ 240 } width="100%">
            <LineChart
                data={ data.chart }
                margin={Styles.chartMargins}
                // syncId={ showSync ? "domainsErrors_4xx" : undefined }
                onClick={onClick}
                // isAnimationActive={ false }
            >
                <CartesianGrid strokeDasharray="3 3" vertical={ false } stroke="#EEEEEE" />
                <XAxis
                    {...Styles.xaxis}
                    dataKey="time"
                    interval={params.density/7}
                />
                <YAxis 
                    {...Styles.yaxis}
                    allowDecimals={false}
                    tickFormatter={val => Styles.tickFormatter(val)}
                    label={{  
                        ...Styles.axisLabelLeft,
                        value: "Number of Sessions"
                    }}
                />
                <Legend />
                <Tooltip {...Styles.tooltip} />
                { Array.isArray(data.namesMap) && data.namesMap.map((key, index) => (
                    <Line
                        key={key}
                        name={key}
                        type="monotone"
                        dataKey={key}
                        stroke={colors[index]}
                        fillOpacity={ 1 }
                        strokeWidth={ 2 }
                        strokeOpacity={ 0.6 }
                        // fill="url(#colorCount)"
                        dot={false}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    )
}

export default CustomMetriLineChart
