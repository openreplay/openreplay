import {GitCommitHorizontal} from 'lucide-react';
import React from 'react';

import ExCard from './ExCard';
import {PERFORMANCE} from "App/constants/card";
import {Bar, BarChart, CartesianGrid, Legend, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {Styles} from "Components/Dashboard/Widgets/common";

const _data = [
    {
        name: 'Jan',
        uv: 4000,
        pv: 2400,
    },
    {
        name: 'Feb',
        uv: 3000,
        pv: 1398,
    },
    {
        name: 'Mar',
        uv: 2000,
        pv: 9800,
    },
    {
        name: 'Apr',
        uv: 2780,
        pv: 3908,
    },
    {
        name: 'May',
        uv: 1890,
        pv: 4800,
    },
    {
        name: 'Jun',
        uv: 2390,
        pv: 3800,
    },
    {
        name: 'Jul',
        uv: 3490,
        pv: 4300,
    },
];

function BarChartCard(props: any) {
    return (
        <ExCard
            {...props}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    width={400}
                    height={280}
                    data={_data}
                    margin={Styles.chartMargins}
                >
                    {/*<CartesianGrid strokeDasharray="3 3"/>*/}
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE"/>
                    <XAxis {...Styles.xaxis} dataKey="name"/>
                    <YAxis {...Styles.yaxis} />
                    <Tooltip {...Styles.tooltip} />
                    <Legend/>
                    <Bar dataKey="pv" fill="#8884d8" activeBar={<Rectangle fill="pink" stroke="blue"/>}/>
                    {/*<Bar dataKey="uv" fill="#82ca9d" activeBar={<Rectangle fill="gold" stroke="purple"/>}/>*/}
                </BarChart>
            </ResponsiveContainer>
        </ExCard>

    );
}

export default BarChartCard;
