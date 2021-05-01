import { Loader, NoContent } from 'UI';
import { Table, widgetHOC, domain } from '../common';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, XAxis, YAxis, CartesianGrid, Area } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const RADIAN = Math.PI / 180;

@widgetHOC('busiestTimeOfDay', { fitContent: true })
export default class BusiestTimeOfTheDay extends React.PureComponent {
  renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, index,
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  render() {
    const { data, loading } = this.props;
    return (
      <Loader loading={ loading } size="small">
          <ResponsiveContainer height={ 140 } width="100%">
            <RadarChart outerRadius={50} width={180} height={180} data={data.toJS()}>
              <PolarGrid />
              <PolarAngleAxis dataKey="hour" tick={{ fill: '#3EAAAF', fontSize: 12 }}  />
              <PolarRadiusAxis />
              <Radar name="count" dataKey="count" stroke="#3EAAAF" fill="#3EAAAF" fillOpacity={0.6} />
            </RadarChart> 
            
          </ResponsiveContainer>
      </Loader>
    );
  }
}
