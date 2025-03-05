// @ts-nocheck
/* eslint-disable i18next/no-literal-string */
import React from 'react';
import { NoContent } from 'UI';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { NO_METRIC_DATA } from 'App/constants/messages';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Styles } from '../../common';
import { useTranslation } from 'react-i18next';

interface Props {
  data: any;
  metric?: any;
}
function ErrorsByOrigin(props: Props) {
  const { metric } = props;
  const { t } = useTranslation();

  return (
    <NoContent
      size="small"
      title={
        <div className="flex items-center gap-2 text-base font-normal">
          <InfoCircleOutlined size={12} /> {NO_METRIC_DATA}
        </div>
      }
      show={metric.data.chart && metric.data.chart.length === 0}
      style={{ height: '240px' }}
    >
      <ResponsiveContainer height={240} width="100%">
        <BarChart data={metric.data.chart} margin={Styles.chartMargins}>
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
            tickFormatter={(val) => Styles.tickFormatter(val)}
            label={{ ...Styles.axisLabelLeft, value: t('Number of Errors') }}
            allowDecimals={false}
          />
          <Legend />
          <Tooltip {...Styles.tooltip} />
          <Bar
            minPointSize={1}
            name={
              <span className="float">
                <sup>st</sup>&nbsp;Party
              </span>
            }
            dataKey="firstParty"
            stackId="a"
            fill={Styles.compareColors[0]}
          />
          <Bar
            name={
              <span className="float">
                <sup>rd</sup>&nbsp;Party
              </span>
            }
            dataKey="thirdParty"
            stackId="a"
            fill={Styles.compareColors[2]}
          />
          {/* <Bar minPointSize={1} name={<span className="float">1<sup>st</sup> Party</span>} dataKey="firstParty" stackId="a" fill={Styles.colors[0]} />
              <Bar name={<span className="float">3<sup>rd</sup> Party</span>} dataKey="thirdParty" stackId="a" fill={Styles.colors[2]} /> */}
        </BarChart>
      </ResponsiveContainer>
    </NoContent>
  );
}

export default ErrorsByOrigin;
