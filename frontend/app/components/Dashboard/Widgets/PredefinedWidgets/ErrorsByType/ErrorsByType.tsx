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
function ErrorsByType(props: Props) {
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
        data={metric.data.chart}
        xInterval={metric.params.density / 7}
        yLabel="Number of Errors"
        valueFormatter={Styles.tickFormatter}
        stack
        series={[
          { key: 'integrations', name: 'Integrations', color: Styles.compareColors[0] },
          { key: '4xx', name: '4xx', color: Styles.compareColors[1] },
          { key: '5xx', name: '5xx', color: Styles.compareColors[2] },
          { key: 'js', name: 'Javascript', color: Styles.compareColors[3] },
        ]}
      />
    </NoContent>
  );
}

export default ErrorsByType;
