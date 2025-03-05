import React from 'react';
import { NoContent } from 'UI';
import { NO_METRIC_DATA } from 'App/constants/messages';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Styles } from '../../common';
import Bar from './Bar';

interface Props {
  data: any;
}

function SessionsPerBrowser(props: Props) {
  const { data } = props;
  const firstAvg = data.chart[0] && data.chart[0].count;

  const getVersions = (item) =>
    Object.keys(item)
      .filter(
        (i) =>
          i !== 'browser' && i !== 'count' && i !== 'time' && i !== 'timestamp',
      )
      .map((i) => ({ key: `v${i}`, value: item[i] }));
  return (
    <NoContent
      size="small"
      title={
        <div className="flex items-center gap-2 text-base font-normal">
          <InfoCircleOutlined size={12} /> {NO_METRIC_DATA}
        </div>
      }
      show={data.chart.length === 0}
      style={{ minHeight: 220 }}
    >
      <div className="w-full" style={{ height: '240px' }}>
        {data.chart.map((item, i) => (
          <Bar
            key={i}
            className="mb-4"
            avg={Math.round(item.count)}
            versions={getVersions(item)}
            width={Math.round((item.count * 100) / firstAvg) - 10}
            domain={item.browser}
            colors={Styles.compareColors}
          />
        ))}
      </div>
    </NoContent>
  );
}

export default SessionsPerBrowser;
