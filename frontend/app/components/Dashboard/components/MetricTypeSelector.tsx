import React from 'react';
import { Segmented } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { tabItems } from 'Components/Dashboard/components/AddCardSection/AddCardSection'
import {
  CARD_LIST,
} from 'Components/Dashboard/components/DashboardList/NewDashModal/ExampleCards';

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
    const selectedCard = CARD_LIST.find((i) => i.key === type);
    if (selectedCard) {
      metricStore.changeType(selectedCard.cardType, selectedCard.metricOf);
    }
  };

  const selected = options.find(
    (i) => {
      if (metric.metricType === 'table') {
        return i.value === metric.metricOf;
      }
      return i.value === metric.metricType
    }) || options[0];
  return (
    <Segmented onChange={onChange} options={options} value={selected.value} />
  );
}

export default observer(MetricTypeSelector);
