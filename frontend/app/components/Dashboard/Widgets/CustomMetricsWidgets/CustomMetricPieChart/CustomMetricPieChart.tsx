import React from 'react'
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, Tooltip } from 'recharts';
import { LineChart, Line, Legend, PieChart, Pie } from 'recharts';
import { Styles } from '../../common';
interface Props {
    data: any;
    params: any;
    // seriesMap: any;
    colors: any;
    onClick?: (event, index) => void;
}
function CustomMetricPieChart(props: Props) {
    const { data, params, colors, onClick = () => null } = props;
    const data01 = [
        { "name": "Group A", "value": 400 },
        { "name": "Group B", "value": 300 },
        { "name": "Group C", "value": 300 },
        { "name": "Group D", "value": 200 },
        { "name": "Group E", "value": 278 },
        { "name": "Group F", "value": 189 }
      ];
    return (
        // <div className="flex flex-col items-center justify-center" style={{ height: '240px'}}>
        //     <div className="text-6xl">0%</div>
        //     <div className="text-lg mt-6">0 ( 0.0% ) from previous hour</div>
        // </div>
        <ResponsiveContainer height={ 240 } width="100%">
            <PieChart width={730} height={250} onClick={onClick}>
                <Pie
                    data={data01}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    fill={colors[0]}
                    activeIndex={1}
                    label
                />
                <Tooltip {...Styles.tooltip} />
            </PieChart>
        </ResponsiveContainer>
    )
}

export default CustomMetricPieChart;
