import React from 'react';
import { Segmented } from 'antd';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { tabItems } from 'Components/Dashboard/components/AddCardSection/AddCardSection';
import { CARD_LIST } from 'Components/Dashboard/components/DashboardList/NewDashModal/ExampleCards';
import FilterSeries from 'App/mstore/types/filterSeries';
import { FUNNEL, USER_PATH } from 'App/constants/card';
import { useTranslation } from 'react-i18next';

function MetricTypeSelector() {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null,
  );
  const metric = metricStore.instance;
  const { cardCategory } = metricStore;
  if (!cardCategory) {
    return null;
  }
  const options = tabItems(t)[cardCategory].map((opt) => ({
    value: opt.type,
    icon: opt.icon,
  }));
  React.useEffect(() => {
    const selected = metric.category
      ? { value: metric.category }
      : options.find((i) => {
          if (metric.metricType === 'table') {
            return i.value === metric.metricOf;
          }
          return i.value === metric.metricType;
        });
    if (selected) {
      setSelectedCategory(selected.value);
    }
  }, []);

  const onChange = (type: string) => {
    const selectedCard = CARD_LIST(t).find((i) => i.key === type);

    if (selectedCard) {
      setSelectedCategory(type);
      metricStore.init();
      const cardData: Record<string, any> = {
        metricType: selectedCard.cardType,
        name: selectedCard.title,
        metricOf: selectedCard.metricOf,
        series: [new FilterSeries()],
        category: type,
      };
      if (selectedCard.filters) {
        cardData.series = [
          new FilterSeries().fromJson({
            name: 'Series 1',
            filter: {
              filters: selectedCard.filters,
            },
          }),
        ];
      }
      if (selectedCard.cardType === USER_PATH) {
        cardData.series = [];
        cardData.series.push(new FilterSeries());
      }
      if (selectedCard.cardType === FUNNEL) {
        cardData.series = [];
        cardData.series.push(new FilterSeries());
        cardData.series[0].filter.addFunnelDefaultFilters();
        cardData.series[0].filter.eventsOrder = 'then';
        cardData.series[0].filter.eventsOrderSupport = ['then'];
      }

      metricStore.merge(cardData);
    }
  };

  return (
    <Segmented onChange={onChange} options={options} value={selectedCategory} />
  );
}

export default observer(MetricTypeSelector);
