import React from 'react';
import { Icon, NoContent } from 'UI';
import { NO_METRIC_DATA } from 'App/constants/messages';
import ListWithIcons from 'Components/Dashboard/Widgets/ListWithIcons';
import { InfoCircleOutlined } from '@ant-design/icons';

interface Props {
  data: any;
}

function ErrorsPerDomain(props: Props) {
  const { data } = props;
  const highest = data.chart[0] && data.chart[0].errorsCount;
  const list = data.chart.slice(0, 4).map((item: any) => ({
    name: item.domain,
    icon: <Icon name="link-45deg" size={24} />,
    value: Math.round(item.errorsCount),
    progress: Math.round((item.errorsCount * 100) / highest),
  }));

  return (
    <NoContent
      size="small"
      show={data.chart.length === 0}
      style={{ height: '240px' }}
      title={
        <div className="flex items-center gap-2 text-base font-normal">
          <InfoCircleOutlined size={12} /> {NO_METRIC_DATA}
        </div>
      }
    >
      <div className="w-full" style={{ height: '240px' }}>
        <ListWithIcons list={list} />
      </div>
    </NoContent>
  );
}

export default ErrorsPerDomain;
