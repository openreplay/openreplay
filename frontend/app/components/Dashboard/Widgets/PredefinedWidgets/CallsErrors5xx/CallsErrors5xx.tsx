import React from 'react';
import { NoContent, Icon } from 'UI';
import TimeseriesChart from 'Components/Charts/TimeseriesChart';
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

export default CallsErrors5xx;
