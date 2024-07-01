import { GitCommitHorizontal } from 'lucide-react';
import React from 'react';

import ExCard from './ExCard';
import { PERFORMANCE } from 'App/constants/card';
import { Bar, BarChart, CartesianGrid, Legend, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Styles } from 'Components/Dashboard/Widgets/common';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
  onClick?: any;
  data?: any,
}

function BarChartCard(props: Props) {
  return (
    <ExCard
      {...props}
    >
      {/*<ResponsiveContainer width="100%" height="100%">*/}
      {/*    <BarChart*/}
      {/*        width={400}*/}
      {/*        height={280}*/}
      {/*        data={_data}*/}
      {/*        margin={Styles.chartMargins}*/}
      {/*    >*/}
      {/*        /!*<CartesianGrid strokeDasharray="3 3"/>*!/*/}
      {/*        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE"/>*/}
      {/*        <XAxis {...Styles.xaxis} dataKey="name"/>*/}
      {/*        <YAxis {...Styles.yaxis} />*/}
      {/*        <Tooltip/>*/}
      {/*        <Legend/>*/}
      {/*        <Bar dataKey="pv" fill="#8884d8" activeBar={<Rectangle fill="pink" stroke="blue"/>}/>*/}
      {/*        /!*<Bar dataKey="uv" fill="#82ca9d" activeBar={<Rectangle fill="gold" stroke="purple"/>}/>*!/*/}
      {/*    </BarChart>*/}
      {/*</ResponsiveContainer>*/}

      <ResponsiveContainer height={240} width="100%">
        <BarChart
          data={props.data?.chart}
          margin={Styles.chartMargins}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE" />
          <XAxis
            {...Styles.xaxis}
            dataKey="time"
            // interval={21}
          />
          <YAxis
            {...Styles.yaxis}
            tickFormatter={val => Styles.tickFormatter(val)}
            label={{ ...Styles.axisLabelLeft, value: props.data?.label || 'Number of Errors' }}
            allowDecimals={false}
          />
          <Legend />
          <Tooltip {...Styles.tooltip} />
          <Bar minPointSize={1} name={<span className="float">One</span>}
               dataKey="value" stackId="a" fill={Styles.colors[0]} />
          {/*<Bar name={<span className="float">3<sup>rd</sup> Party</span>} dataKey="thirdParty" stackId="a"*/}
          {/*     fill={Styles.colors[2]}/>*/}
        </BarChart>
      </ResponsiveContainer>
    </ExCard>

  );
}

export default BarChartCard;
