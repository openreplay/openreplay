import React from 'react';
import { AreaChart, Area } from 'recharts';
import { Styles } from '../../common';

const Chart = ({ data, compare }) => {
  const colors = compare ? Styles.compareColors : Styles.colors;

  return (
    <AreaChart width={ 90 } height={ 30 } data={ data.chart } >
      <Area type="monotone" dataKey="count" stroke={colors[0]} fill={colors[3]} fillOpacity={ 0.5 } />
    </AreaChart>
  );
}

Chart.displayName = 'Chart';

export default Chart;
