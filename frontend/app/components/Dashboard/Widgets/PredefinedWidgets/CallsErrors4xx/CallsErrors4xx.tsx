import React from 'react';
import { NoContent } from 'UI';
import TimeseriesChart from 'Components/Charts/TimeseriesChart';
import { NO_METRIC_DATA } from 'App/constants/messages';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Styles } from '../../common';

interface Props {
  data: any;
  metric?: any;
}
function CallsErrors4xx(props: Props) {
  const { data, metric } = props;
  return (
    <NoContent
      size="small"
      title={
        <div className="flex items-center gap-2 text-base font-normal">
          <InfoCircleOutlined size={12} /> {NO_METRIC_DATA}
        </div>
      }
      show={metric.data.chart.length === 0}
      style={{ height: '240px' }}
    >
      <TimeseriesChart
        type="line"
        showLegend={false}
        data={metric.data.chart}
        xInterval={metric.params.density / 7}
        yLabel="Number of Errors"
        series={(Array.isArray(metric.data.namesMap) ? metric.data.namesMap : []).map(
          (key: string, index: number) => ({
            key,
            name: key,
            color: Styles.colors[index % Styles.colors.length],
          }),
        )}
      />
    </NoContent>
  );
}

export default CallsErrors4xx;
