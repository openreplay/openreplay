import React from 'react'
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Area, Tooltip } from 'recharts';
import { LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { Styles } from '../../common';


function renderCustomizedLabel({
  cx, cy, midAngle, innerRadius, outerRadius, value, color, startAngle, endAngle}) {
  const RADIAN = Math.PI / 180;
  const diffAngle = endAngle - startAngle;
  const delta = ((360-diffAngle)/15)-1;
  const radius = innerRadius + (outerRadius - innerRadius);
  const x = cx + (radius+delta) * Math.cos(-midAngle * RADIAN);
  const y = cy + (radius+(delta*delta)) * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill={color} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="normal">
      {value}
    </text>
  );
};
function renderCustomizedLabelLine(props){
  let { cx, cy, midAngle, innerRadius, outerRadius, color, startAngle, endAngle } = props;
  const RADIAN = Math.PI / 180;
  const diffAngle = endAngle - startAngle;
  const radius = 10 + innerRadius + (outerRadius - innerRadius);
  let path='';
  for(let i=0;i<((360-diffAngle)/15);i++){
    path += `${(cx + (radius+i) * Math.cos(-midAngle * RADIAN))},${(cy + (radius+i*i) * Math.sin(-midAngle * RADIAN))} `
  }
  return (
    <polyline points={path} stroke={color} fill="none" />
  );
}
interface Props {
    data: any;
    params: any;
    // seriesMap: any;
    colors: any;
    onClick?: (event, index) => void;
}

function CustomMetricPieChart(props: Props) {
    const { data = { values: [] }, params, colors, onClick = () => null } = props;
    return (
        <ResponsiveContainer height={ 240 } width="100%">
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
                    labelLine={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      value,
                      index
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
                          if (percentage<3){
                              return null;
                          }
                          return (
                              <text
                                  x={x}
                                  y={y}
                                  fontWeight="300"
                                  fontSize="12px"
                                  // fontFamily="'Source Sans Pro', 'Roboto', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'"
                                  textAnchor={x > cx ? "start" : "end"}
                                  dominantBaseline="central"
                                  fill='#3EAAAF'
                              >
                                  {data.values[index].name} - ({value})
                              </text>
                          );
                      }}
                    // label={({
                    //     cx,
                    //     cy,
                    //     midAngle,
                    //     innerRadius,
                    //     outerRadius,
                    //     value,
                    //     index
                    //   }) => {
                    //     const RADIAN = Math.PI / 180;
                    //     const radius = 30 + innerRadius + (outerRadius - innerRadius);
                    //     const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    //     const y = cy + radius * Math.sin(-midAngle * RADIAN);
              
                    //     return (
                    //       <text
                    //         x={x}
                    //         y={y}
                    //         fill="#3EAAAF"
                    //         textAnchor={x > cx ? "start" : "end"}
                    //         dominantBaseline="top"
                    //         fontSize={10}
                    //       >
                    //         {data.values[index].name} ({value})
                    //       </text>
                    //     );
                    //   }}
                >
                  {data.values.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Styles.colorsPie[index % Styles.colorsPie.length]} />
                  ))}
                </Pie>
                <Tooltip {...Styles.tooltip} />
            </PieChart>
        </ResponsiveContainer>
    )
}

export default CustomMetricPieChart;
