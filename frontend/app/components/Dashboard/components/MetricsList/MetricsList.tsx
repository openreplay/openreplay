import { observer, useObserver } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { NoContent, Pagination, Icon, Loader } from 'UI';
import { useStore } from 'App/mstore';
import { sliceListPerPage } from 'App/utils';
import GridView from './GridView';
import ListView from './ListView';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function MetricsList({
                       siteId,
                       onSelectionChange
                     }: {
  siteId: string;
  onSelectionChange?: (selected: any[]) => void;
}) {
  const { metricStore, dashboardStore } = useStore();
  const metricsSearch = metricStore.filter.query;
  const listView = useObserver(() => metricStore.listView);
  const [selectedMetrics, setSelectedMetrics] = useState<any>([]);

  const dashboard = dashboardStore.selectedDashboard;
  const existingCardIds = useMemo(() => dashboard?.widgets?.map(i => parseInt(i.metricId)), [dashboard]);
  const cards = useMemo(() => !!onSelectionChange ? metricStore.filteredCards.filter(i => !existingCardIds?.includes(parseInt(i.metricId))) : metricStore.filteredCards, [metricStore.filteredCards]);
  const loading = metricStore.isLoading;

  useEffect(() => {
    metricStore.fetchList();
  }, []);

  useEffect(() => {
    if (!onSelectionChange) {
      return;
    }
    onSelectionChange(selectedMetrics);
  }, [selectedMetrics]);

  const toggleMetricSelection = (id: any) => {
    if (selectedMetrics.includes(id)) {
      setSelectedMetrics(selectedMetrics.filter((i: number) => i !== id));
    } else {
      setSelectedMetrics([...selectedMetrics, id]);
    }
  };

  const lenth = cards.length;

  useEffect(() => {
    metricStore.updateKey('sessionsPage', 1);
  }, []);

  return (
    <Loader loading={loading}>
      <NoContent
        show={lenth === 0}
        title={
          <div className='flex flex-col items-center justify-center'>
            <AnimatedSVG name={ICONS.NO_CARDS} size={180} />
            <div className='text-center mt-4'>
              {metricsSearch !== '' ? 'No matching results' : 'You haven\'t created any cards yet'}
            </div>
          </div>
        }
        subtext='Utilize cards to visualize key user interactions or product performance metrics.'
      >
        {listView ? (
          <ListView
            disableSelection={!onSelectionChange}
            siteId={siteId}
            list={sliceListPerPage(cards, metricStore.page - 1, metricStore.pageSize)}
            selectedList={selectedMetrics}
            existingCardIds={existingCardIds}
            toggleSelection={toggleMetricSelection}
            allSelected={cards.length === selectedMetrics.length}
            toggleAll={({ target: { checked, name } }) =>
              setSelectedMetrics(checked ? cards.map((i: any) => i.metricId).slice(0, 30 - existingCardIds!.length) : [])
            }
          />
        ) : (
          <GridView
            siteId={siteId}
            list={sliceListPerPage(cards, metricStore.page - 1, metricStore.pageSize)}
            selectedList={selectedMetrics}
            toggleSelection={toggleMetricSelection}
          />
        )}

        <div className='w-full flex items-center justify-between py-4 px-6 border-t'>
          <div className='text-disabled-text'>
            Showing{' '}
            <span className='font-semibold'>{Math.min(cards.length, metricStore.pageSize)}</span> out
            of <span className='font-semibold'>{cards.length}</span> cards
          </div>
          <Pagination
            page={metricStore.page}
            totalPages={Math.ceil(lenth / metricStore.pageSize)}
            onPageChange={(page) => metricStore.updateKey('page', page)}
            limit={metricStore.pageSize}
            debounceRequest={100}
          />
        </div>
      </NoContent>
    </Loader>
  );
}

export default observer(MetricsList);
