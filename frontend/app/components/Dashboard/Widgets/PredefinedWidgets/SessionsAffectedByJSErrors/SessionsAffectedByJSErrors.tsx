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
function SessionsAffectedByJSErrors(props: Props) {
  const { data, metric } = props;
  return (
    <NoContent
      title={
        <div className="flex items-center gap-2 text-base font-normal">
          <InfoCircleOutlined size={12} /> {NO_METRIC_DATA}
        </div>
      }
      size="small"
      show={metric.data.chart.length === 0}
      style={{ height: '240px' }}
    >
      <TimeseriesChart
        data={metric.data.chart}
        xInterval={metric.params.density / 7}
        yLabel="Number of Sessions"
        stack
        series={[
          { key: 'sessionsCount', name: 'Sessions', color: Styles.colors[0] },
        ]}
      />
    </NoContent>
  );
}

export default SessionsAffectedByJSErrors;
