// @ts-nocheck
import React from 'react';
import { NoContent } from 'UI';
import TimeseriesChart from 'Components/Charts/TimeseriesChart';
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
      <TimeseriesChart
        data={metric.data.chart}
        xInterval={metric.params.density / 7}
        yLabel={t('Number of Errors')}
        stack
        series={[
          { key: 'firstParty', name: t('1st Party'), color: Styles.compareColors[0] },
          { key: 'thirdParty', name: t('3rd Party'), color: Styles.compareColors[2] },
        ]}
      />
    </NoContent>
  );
}

export default ErrorsByOrigin;
