import React from 'react';
import { NoContent } from 'UI';
import { InfoCircleOutlined } from '@ant-design/icons';

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
import { AvgLabel, Styles } from 'Components/Dashboard/Widgets/common';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
  onClick?: any;
  data?: any;
}

// interface Props {
//     data: any,
//     label?: string
// }

function AreaChartCard(props: Props) {
  const { data } = props;
  const gradientDef = Styles.gradientDef();

  return (
    <ExCard
      {...props}
      title={
        <div className="flex items-center gap-2">
          <div>{props.title}</div>
        </div>
      }
    >
      <NoContent
        size="small"
        title={
          <div className="flex items-center gap-2 text-base font-normal">
            <InfoCircleOutlined size={12} /> {NO_METRIC_DATA}
          </div>
        }
        show={data?.chart.length === 0}
      >
        <>
          {/* <div className="flex items-center justify-end mb-3"> */}
          {/*    <AvgLabel text="Avg" className="ml-3" count={data?.value}/> */}
          {/* </div> */}
          <ResponsiveContainer width="100%">
            <AreaChart data={data?.chart} margin={Styles.chartMargins}>
              {gradientDef}
              <CartesianGrid
                strokeDasharray="1 3"
                vertical={false}
                stroke="rgba(0,0,0,1.5)"
              />
              <XAxis {...Styles.xaxis} dataKey="time" interval={3} />
              <YAxis
                {...Styles.yaxis}
                allowDecimals={false}
                tickFormatter={(val) => Styles.tickFormatter(val)}
                label={{ ...Styles.axisLabelLeft, value: data?.label }}
              />
              <Tooltip {...Styles.tooltip} />
              <Area
                name="Avg"
                type="monotone"
                dataKey="value"
                stroke={Styles.strokeColor}
                fillOpacity={1}
                strokeWidth={2}
                strokeOpacity={0.8}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      </NoContent>
    </ExCard>
  );
}

export default AreaChartCard;
