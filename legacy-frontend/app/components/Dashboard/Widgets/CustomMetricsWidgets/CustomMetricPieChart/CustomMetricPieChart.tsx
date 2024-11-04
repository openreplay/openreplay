//@ts-nocheck
import React from 'react'
import { ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import { Styles } from '../../common';
import { NoContent } from 'UI';
import { filtersMap } from 'Types/filter/newFilter';
import { numberWithCommas } from 'App/utils';
interface Props {
    metric: any,
    data: any;
    colors: any;
    onClick?: (filters) => void;
}

function CustomMetricPieChart(props: Props) {
    const { metric, data = { values: [] }, onClick = () => null } = props;

    const onClickHandler = (event) => {
        if (event && !event.payload.group) {
            const filters = Array<any>();
            let filter = { ...filtersMap[metric.metricOf] }
            filter.value = [event.payload.name]
            filter.type = filter.key
            delete filter.key
            delete filter.operatorOptions
            delete filter.category
            delete filter.icon
            delete filter.label
            delete filter.options

            filters.push(filter);
            onClick(filters);
        }
    }
    return (
        <NoContent size="small" title="No data available" show={!data.values || data.values.length === 0} style={{ minHeight: '240px'}}>
            <ResponsiveContainer height={ 220 } width="100%">
                <PieChart>
                    <Pie
                        isAnimationActive={ false }
                        data={data.values}
                        dataKey="sessionCount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        // innerRadius={40}
                        outerRadius={70}
                        // fill={colors[0]}
                        activeIndex={1}
                        onClick={onClickHandler}
                        labelLine={({
                            cx,
                            cy,
                            midAngle,
                            innerRadius,
                            outerRadius,
                            value,
                        }) => {
                            const RADIAN = Math.PI / 180;
                                let radius1 = 15 + innerRadius + (outerRadius - innerRadius);
                                let radius2 = innerRadius + (outerRadius - innerRadius);
                                let x2 = cx + radius1 * Math.cos(-midAngle * RADIAN);
                                let y2 = cy + radius1 * Math.sin(-midAngle * RADIAN);
                                let x1 = cx + radius2 * Math.cos(-midAngle * RADIAN);
                                let y1 = cy + radius2 * Math.sin(-midAngle * RADIAN);

                                const percentage = value * 100 / data.values.reduce((a, b) => a + b.sessionCount, 0);
                        
                                if (percentage<3){
                                    return null;
                                }
                        
                                return(
                                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3EAAAF" strokeWidth={1} />
                                )
                            }}
                            label={({
                                cx,
                                cy,
                                midAngle,
                                innerRadius,
                                outerRadius,
                                value,
                                index
                            }) => {
                                const RADIAN = Math.PI / 180;
                                let radius = 20 + innerRadius + (outerRadius - innerRadius);
                                let x = cx + radius * Math.cos(-midAngle * RADIAN);
                                let y = cy + radius * Math.sin(-midAngle * RADIAN);
                                const percentage = (value / data.values.reduce((a, b) => a + b.sessionCount, 0)) * 100;
                                let name = data.values[index].name || 'Unidentified';
                                name = name.length > 20 ? name.substring(0, 20) + '...' : name; 
                                if (percentage<3){
                                    return null;
                                }
                                return (
                                    <text
                                        x={x}
                                        y={y}
                                        fontWeight="400"
                                        fontSize="12px"
                                        // fontFamily="'Source Sans Pro', 'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'"
                                        textAnchor={x > cx ? "start" : "end"}
                                        dominantBaseline="central"
                                        fill='#666'
                                    >
                                        {name || 'Unidentified'} {numberWithCommas(value)}
                                    </text>
                                );
                            }}
                    >
                        {data && data.values && data.values.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={Styles.colorsPie[index % Styles.colorsPie.length]} />
                        ))}
                    </Pie>
                    <Tooltip {...Styles.tooltip} />
                </PieChart>
                
            </ResponsiveContainer>
            <div className="text-sm color-gray-medium">Top 5 </div>
        </NoContent>
    )
}

export default CustomMetricPieChart;
