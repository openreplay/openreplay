import React from 'react';
import {
  ScatterChart,
  Scatter,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  dataFirst: any;
  dataSecond: any;
}
function ScatterChartComponent(props: Props) {
  const { dataFirst, dataSecond } = props;
  return (
    <div className="rounded border shadow">
      <div className="text-lg p-3 border-b bg-gray-lightest">Scatter Chart</div>
      <div className="">
        <ResponsiveContainer height={500} width="100%">
          <ScatterChart
            width={730}
            height={250}
            margin={{ top: 20, right: 20, bottom: 10, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name="stature" unit="cm" />
            <YAxis dataKey="y" name="weight" unit="kg" />
            <ZAxis dataKey="z" range={[64, 144]} name="score" unit="km" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="A school" data={dataFirst} fill="#8884d8" />
            <Scatter name="B school" data={dataSecond} fill="#82ca9d" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ScatterChartComponent;
