import React, { useEffect, useMemo, lazy } from 'react';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Loader } from 'UI';
import { Card } from 'antd';
import { CARD_CATEGORIES } from 'Components/Dashboard/components/DashboardList/NewDashModal/ExampleCards';

const CARD_TYPES_MAP = CARD_CATEGORIES.reduce((acc: any, category: any) => {
  acc[category.key] = category.types;
  return acc;
}, {});

const WidgetChart = lazy(
  () => import('Components/Dashboard/components/WidgetChart/WidgetChart'),
);

interface Props {
  category?: string;
  selectedList: any;
  onCard: (metricId: number) => void;
  query?: string;
}

function CardsLibrary(props: Props) {
  const { selectedList, query = '' } = props;
  const { metricStore, dashboardStore } = useStore();

  // const cards = useMemo(() => {
  //     return metricStore.filteredCards.filter((card: any) => {
  //         return CARD_TYPES_MAP[props.category || 'default'].includes(card.metricType);
  //     });
  // }, [metricStore.filteredCards, props.category]);

  const cards = useMemo(
    () =>
      metricStore.filteredCards.filter((card: any) =>
        card.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, metricStore.filteredCards],
  );

  useEffect(() => {
    metricStore.fetchList();
  }, []);

  const onItemClick = (e: any, metricId: number) => {
    e.stopPropagation();
    e.preventDefault();
    props.onCard(metricId);
  };

  return (
    <Loader loading={metricStore.isLoading}>
      <div className="grid grid-cols-4 gap-4 items-start">
        {cards.map((metric: any) => (
          <React.Fragment key={metric.metricId}>
            <div className={`relative col-span-${metric.config.col}`}>
              <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={(e) => onItemClick(e, metric.metricId)}
              />
              <Card
                className="border border-transparent hover:border-indigo-50 hover:shadow-sm rounded-lg"
                style={{
                  border: selectedList.includes(metric.metricId)
                    ? '1px solid #1890ff'
                    : '1px solid #f0f0f0',
                }}
                styles={{
                  header: {
                    padding: '4px 14px',
                    minHeight: '36px',
                    fontSize: '14px',
                    borderBottom: 'none',
                  },
                  body: { padding: '14px' },
                  cover: {
                    border: '2px solid #1890ff',
                    // border: selectedList.includes(metric.metricId) ? '2px solid #1890ff' : 'none',
                  },
                }}
                title={metric.name}
              >
                <WidgetChart
                  // isPreview={true}
                  metric={metric}
                  isTemplate
                  isWidget
                  isSaved
                />
              </Card>
            </div>
          </React.Fragment>
        ))}
      </div>
    </Loader>
  );
}

export default observer(CardsLibrary);
