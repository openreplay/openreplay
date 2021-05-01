import { AreaChart, Area } from 'recharts';

const Chart = ({ data }) => {
  return (
    <AreaChart width={ 90 } height={ 30 } data={ data.chart } >
      <Area type="monotone" dataKey="avgDuration" stroke="#3EAAAF" fill="#A8E0DA" fillOpacity={ 0.5 } />
    </AreaChart>
  );
}

Chart.displayName = 'Chart';

export default Chart;
