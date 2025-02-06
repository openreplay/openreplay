import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { NoContent, Loader, Pagination } from 'UI';
import { useStore } from 'App/mstore';
import { sliceListPerPage } from 'App/utils';
import GridView from './GridView';
import ListView from './ListView';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import AddCardSection from '../AddCardSection/AddCardSection';
import { Popover, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

function MetricsList({
  siteId,
  onSelectionChange,
  inLibrary,
}: {
  siteId: string;
  onSelectionChange?: (selected: any[]) => void;
  inLibrary?: boolean;
}) {
  const { metricStore, dashboardStore } = useStore();
  const metricsSearch = metricStore.filter.query;
  const listView = inLibrary ? true : metricStore.listView;
  const [selectedMetrics, setSelectedMetrics] = useState<any>([]);

  const dashboard = dashboardStore.selectedDashboard;
  const existingCardIds = useMemo(
    () => dashboard?.widgets?.map((i) => parseInt(i.metricId)),
    [dashboard]
  );
  const cards = useMemo(
    () =>
      !!onSelectionChange
        ? metricStore.filteredCards.filter(
            (i) => !existingCardIds?.includes(parseInt(i.metricId))
          )
        : metricStore.filteredCards,
    [metricStore.filteredCards, existingCardIds, onSelectionChange]
  );
  const loading = metricStore.isLoading;

  useEffect(() => {
    void metricStore.fetchList();
  }, [metricStore]);

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

  const length = cards.length;

  useEffect(() => {
    metricStore.updateKey('sessionsPage', 1);
  }, [metricStore]);

  const showOwn = metricStore.filter.showMine;
  const toggleOwn = () => {
    metricStore.updateKey('showMine', !showOwn);
  };

  
  const isFiltered =
  metricsSearch !== '' || (metricStore.filter.type && metricStore.filter.type !== 'all');    

  const searchImageDimensions = { width: 60, height: 'auto' };
  const defaultImageDimensions = { width: 600, height: 'auto' };
  const emptyImage = isFiltered ? ICONS.NO_RESULTS : ICONS.NO_CARDS;
  const imageDimensions = isFiltered ? searchImageDimensions : defaultImageDimensions;


  return (
    <Loader loading={loading}>
      <NoContent
  show={length === 0}
  title={
    <div className="flex flex-col items-center justify-center">
      <AnimatedSVG name={emptyImage} size={imageDimensions.width} />
      <div className="text-center mt-3 text-lg font-medium">
        {isFiltered
          ? 'No matching results'
          : 'Unlock insights with data cards'}
      </div>
    </div>
      }
      subtext={
        isFiltered ? (
          ''
        ) : (
          <div className="flex flex-col items-center">
            <div>
              Create and customize cards to analyze trends and user behavior effectively.
            </div>
            <Popover
              arrow={false}
              overlayInnerStyle={{ padding: 0, borderRadius: '0.75rem' }}
              content={<AddCardSection fit inCards />}
              trigger="click"
            >
              <Button type="primary" icon={<PlusOutlined />} className="btn-create-card mt-3">
                Create Card
              </Button>
            </Popover>
          </div>
        )
      }
    >
        {listView ? (
          <ListView
            disableSelection={!onSelectionChange}
            siteId={siteId}
            list={cards}
            inLibrary={inLibrary}
            selectedList={selectedMetrics}
            existingCardIds={existingCardIds}
            toggleSelection={toggleMetricSelection}
            allSelected={cards.length === selectedMetrics.length}
            showOwn={showOwn}
            toggleOwn={toggleOwn}
            toggleAll={({ target: { checked } }) =>
              setSelectedMetrics(
                checked
                  ? cards.map((i: any) => i.metricId).slice(0, 30 - (existingCardIds?.length || 0))
                  : []
              )
            }
          />
        ) : (
          <>
            <GridView
              siteId={siteId}
              list={sliceListPerPage(cards, metricStore.page - 1, metricStore.pageSize)}
              selectedList={selectedMetrics}
              toggleSelection={toggleMetricSelection}
            />
            <div className="w-full flex items-center justify-between py-4 px-6 border-t">
              <div>
                Showing{' '}
                <span className="font-medium">
                  {Math.min(cards.length, metricStore.pageSize)}
                </span>{' '}
                out of <span className="font-medium">{cards.length}</span> cards
              </div>
              <Pagination
                page={metricStore.page}
                total={length}
                onPageChange={(page) => metricStore.updateKey('page', page)}
                limit={metricStore.pageSize}
                debounceRequest={100}
              />
            </div>
          </>
        )}
      </NoContent>
    </Loader>
  );
}

export default observer(MetricsList);