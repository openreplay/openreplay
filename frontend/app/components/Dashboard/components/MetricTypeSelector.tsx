import React from 'react';
import { Segmented } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { tabItems } from 'Components/Dashboard/components/AddCardSection/AddCardSection'

function MetricTypeSelector() {
  const { metricStore } = useStore();
  const metric = metricStore.instance;
  const cardCategory = metricStore.cardCategory;
  if (!cardCategory) {
    return null;
  }
  const options = tabItems[cardCategory].map(opt => ({
    value: opt.type,
    icon: opt.icon,
  }))
  const onChange = (type: string) => {
    metricStore.changeType(type);
  };

  const selected = options.find((i) => i.value === metric.metricType) || options[0];
  return (
    <Segmented onChange={onChange} options={options} value={selected.value} />
  );
}

export default observer(MetricTypeSelector);
