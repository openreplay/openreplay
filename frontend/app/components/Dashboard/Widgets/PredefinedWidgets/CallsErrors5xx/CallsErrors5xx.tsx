import React from 'react';
import { NoContent, Icon } from 'UI';
import {
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { Styles } from '../../common';
import { useTranslation } from 'react-i18next';

interface Props {
  data: any;
  metric?: any;
}
function CallsErrors5xx(props: Props) {
  const { t } = useTranslation();
  const { data, metric } = props;
  return (
    <NoContent
      size="small"
      title={
        <div className="flex items-center">
          <Icon name="info-circle" className="mr-2" size="14" />
          {t('No data available for the selected period.')}
        </div>
      }
      show={metric.data.chart.length === 0}
      style={{ height: '240px' }}
    >
      <ResponsiveContainer height={240} width="100%">
        <LineChart data={metric.data.chart} margin={Styles.chartMargins}>
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
            label={{ ...Styles.axisLabelLeft, value: 'Number of Errors' }}
            allowDecimals={false}
          />
          {/* <Legend /> */}
          <Tooltip {...Styles.tooltip} />
          {Array.isArray(metric.data.namesMap) &&
            metric.data.namesMap.map((key, index) => (
              <Line
                key={key}
                name={key}
                type="monotone"
                dataKey={key}
                stroke={Styles.colors[index]}
                fillOpacity={1}
                strokeWidth={2}
                strokeOpacity={0.8}
                fill="url(#colorCount)"
                dot={false}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </NoContent>
  );
}

export default CallsErrors5xx;
