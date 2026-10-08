import { NoContent } from '@/ui/feedback/NoContent';
import { Icon } from '@/ui/icons/Icon';
import { Info } from 'lucide-react';
import React from 'react';

import { NO_METRIC_DATA } from 'App/constants/messages';
import ListWithIcons from 'Components/Dashboard/Widgets/ListWithIcons';

interface Props {
  data: any;
}

function SlowestDomains(props: Props) {
  const { data } = props;
  // TODO - move this to the store
  const highest = data.chart[0]?.value;
  const list = data.chart.slice(0, 4).map((item: any) => ({
    name: item.domain,
    icon: <Icon name="link-45deg" size={24} />,
    value: `${Math.round(item.value)}ms`,
    progress: Math.round((item.value * 100) / highest),
  }));

  return (
    <NoContent
      size="small"
      show={list.length === 0}
      style={{ minHeight: 220 }}
      title={
        <div className="flex items-center gap-2 text-base font-normal">
          <Info size={12} /> {NO_METRIC_DATA}
        </div>
      }
    >
      <div className="w-full" style={{ height: '240px' }}>
        <ListWithIcons list={list} />
      </div>
    </NoContent>
  );
}

export default SlowestDomains;
