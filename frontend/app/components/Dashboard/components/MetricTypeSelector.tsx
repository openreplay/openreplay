import React from 'react';
import { Segmented } from 'antd';
import { LineChart, AlignStartVertical } from 'lucide-react';
import { Icon } from 'UI'; //dashboards/user-journey , dashboards/heatmap-2, signpost-split
import {
  TIMESERIES,
  FUNNEL,
  USER_PATH,
  HEATMAP,
  RETENTION,
} from 'App/constants/card';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

const types = [
  {
    icon: <LineChart width={16} />,
    value: TIMESERIES,
  },
  {
    icon: <AlignStartVertical width={16} />,
    value: FUNNEL,
  },
  {
    icon: <Icon name={'dashboards/user-journey'} color={'inherit'} size={16} />,
    value: USER_PATH,
  },
  {
    icon: <Icon name={'dashboards/heatmap-2'} color={'inherit'} size={16} />,
    value: HEATMAP,
  },
  {
    icon: <Icon name={'signpost-split'} color={'inherit'} size={16} />,
    value: RETENTION,
  },
];

function MetricTypeSelector() {
  const { metricStore } = useStore();
  const metric = metricStore.instance;

  const onChange = (type: string) => {
    metricStore.changeType(type);
  };

  const selected = types.find((i) => i.value === metric.metricType) || types[0];
  return (
    <Segmented onChange={onChange} options={types} value={selected.value} />
  );
}

export default observer(MetricTypeSelector);
