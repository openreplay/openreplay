import { BarChart, Bar } from 'recharts';

const Chart = ({ data }) => (
  <BarChart width={ 90 } height={ 30 } data={ data.chart }>
    <Bar dataKey="count" fill="#A8E0DA" />
  </BarChart>
);

Chart.displaName = 'Chart';

export default Chart;
