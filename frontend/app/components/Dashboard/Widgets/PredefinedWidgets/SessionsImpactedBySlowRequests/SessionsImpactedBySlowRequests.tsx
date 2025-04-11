import React from 'react';
import { NoContent } from 'UI';
import {
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { NO_METRIC_DATA } from 'App/constants/messages';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Styles } from '../../common';

interface Props {
  data: any;
  metric?: any;
}
function SessionsImpactedBySlowRequests(props: Props) {
  const { data, metric } = props;
  const gradientDef = Styles.gradientDef();

  return (
    <NoContent
      title={
        <div className="flex items-center gap-2 text-base font-normal">
          <InfoCircleOutlined size={12} /> {NO_METRIC_DATA}
        </div>
      }
      size="small"
      show={metric.data.chart.length === 0}
    >
      <ResponsiveContainer height={240} width="100%">
        <AreaChart data={metric.data.chart} margin={Styles.chartMargins}>
          {gradientDef}
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#EEEEEE"
          />
          <XAxis
            {...Styles.xaxis}
            dataKey="time"
            interval={metric.params.density / 7}
          />
          <YAxis
            {...Styles.yaxis}
            allowDecimals={false}
            tickFormatter={(val) => Styles.tickFormatter(val)}
            label={{ ...Styles.axisLabelLeft, value: 'Number of Sessions' }}
          />
          <Tooltip {...Styles.tooltip} />
          <Area
            name="Sessions"
            type="monotone"
            dataKey="count"
            stroke={Styles.strokeColor}
            fillOpacity={1}
            strokeWidth={2}
            strokeOpacity={0.8}
            fill="url(#colorCount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </NoContent>
  );
}

export default SessionsImpactedBySlowRequests;
