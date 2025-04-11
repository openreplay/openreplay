import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { NoContent, Loader, Pagination } from 'UI';
import { useStore } from 'App/mstore';
import { sliceListPerPage } from 'App/utils';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { Popover, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import ListView from './ListView';
import AddCardSection from '../AddCardSection/AddCardSection';
import { useTranslation } from 'react-i18next';

function MetricsList({
                       siteId,
                       onSelectionChange,
                       inLibrary
                     }: {
  siteId: string;
  onSelectionChange?: (selected: any[]) => void;
  inLibrary?: boolean;
}) {
  const { t } = useTranslation();
  const { metricStore, dashboardStore } = useStore();
  const metricsSearch = metricStore.filter.query;
  const [selectedMetrics, setSelectedMetrics] = useState<any>([]);

  const dashboard = dashboardStore.selectedDashboard;
  const existingCardIds = useMemo(
    () => dashboard?.widgets?.map((i) => parseInt(i.metricId)),
    [dashboard]
  );
  const cards = useMemo(
    () =>
      onSelectionChange
        ? metricStore.filteredCards.filter(
          (i) => !existingCardIds?.includes(parseInt(i.metricId))
        )
        : metricStore.filteredCards,
    [metricStore.filteredCards, existingCardIds, onSelectionChange]
  );
  const loading = metricStore.isLoading;

  useEffect(() => {
    void metricStore.fetchList();
  }, [metricStore.page, metricStore.filter, metricStore.sort]);

  useEffect(() => {
    if (!onSelectionChange) return;
    onSelectionChange(selectedMetrics);
  }, [selectedMetrics, onSelectionChange]);

  const toggleMetricSelection = (id: any) => {
    if (Array.isArray(id)) {
      setSelectedMetrics(id);
      return;
    }
    if (selectedMetrics.includes(id)) {
      setSelectedMetrics((prev: number[]) => prev.filter((i) => i !== id));
    } else {
      setSelectedMetrics((prev: number[]) => [...prev, id]);
    }
  };

  const { length } = cards;

  useEffect(() => {
    metricStore.updateKey('sessionsPage', 1);
  }, [metricStore]);


  const isFiltered = metricStore.filter.query !== '' || metricStore.filter.type !== '';

  const searchImageDimensions = { width: 60, height: 'auto' };
  const defaultImageDimensions = { width: 600, height: 'auto' };
  const emptyImage = isFiltered ? ICONS.NO_RESULTS : ICONS.NO_CARDS;
  const imageDimensions = isFiltered
    ? searchImageDimensions
    : defaultImageDimensions;

  return (
    <NoContent
      show={!loading && length === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <AnimatedSVG name={emptyImage} size={imageDimensions.width} />
          <div className="text-center mt-3 text-lg font-medium">
            {isFiltered
              ? t('No matching results')
              : t('Unlock insights with data cards')}
          </div>
        </div>
      }
      subtext={
        isFiltered ? (
          ''
        ) : (
          <div className="flex flex-col items-center">
            <div>
              {t('Create and customize cards to analyze trends and user behavior effectively.')}
            </div>
            <Popover
              arrow={false}
              overlayInnerStyle={{ padding: 0, borderRadius: '0.75rem' }}
              content={<AddCardSection fit inCards />}
              trigger="click"
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="btn-create-card mt-3"
              >
                {t('Create Card')}
              </Button>
            </Popover>
          </div>
        )
      }
    >
      <ListView
        loading={loading}
        disableSelection={!onSelectionChange}
        siteId={siteId}
        list={cards}
        inLibrary={inLibrary}
        selectedList={selectedMetrics}
        // existingCardIds={existingCardIds}
        toggleSelection={toggleMetricSelection}
        // allSelected={cards.length === selectedMetrics.length}
        // toggleAll={({ target: { checked } }) =>
        //   setSelectedMetrics(
        //     checked
        //       ? cards
        //         .map((i: any) => i.metricId)
        //         .slice(0, 30 - (existingCardIds?.length || 0))
        //       : []
        //   )
        // }
      />
    </NoContent>
  );
}

export default observer(MetricsList);
