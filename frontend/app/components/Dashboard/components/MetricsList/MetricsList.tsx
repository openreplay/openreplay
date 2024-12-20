import { observer, useObserver } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { NoContent, Pagination, Loader } from 'UI';
import { useStore } from 'App/mstore';
import { sliceListPerPage } from 'App/utils';
import GridView from './GridView';
import ListView from './ListView';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function MetricsList({
  siteId,
  onSelectionChange,
}: {
  siteId: string;
  onSelectionChange?: (selected: any[]) => void;
}) {
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
      !!onSelectionChange
        ? metricStore.filteredCards.filter(
            (i) => !existingCardIds?.includes(parseInt(i.metricId))
          )
        : metricStore.filteredCards,
    [metricStore.filteredCards]
  );
  const loading = metricStore.isLoading;

  useEffect(() => {
    void metricStore.fetchList();
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

  const length = cards.length;

  useEffect(() => {
    metricStore.updateKey('sessionsPage', 1);
  }, []);

  const showOwn = metricStore.filter.showMine;
  const toggleOwn = () => {
    metricStore.updateKey('showMine', !showOwn);
  }
  return (
    <Loader loading={loading}>
      <NoContent
        show={length === 0}
        title={
          <div className="flex flex-col items-center justify-center">
            <AnimatedSVG name={ICONS.NO_CARDS} size={60} />
            <div className="text-center mt-4  text-lg font-medium">
              {metricsSearch !== ''
                ? 'No matching results'
                : "You haven't created any cards yet"}
            </div>
          </div>
        }
        subtext="Utilize cards to visualize key user interactions or product performance metrics."
      >
        <ListView
          disableSelection={!onSelectionChange}
          siteId={siteId}
          list={cards}
          selectedList={selectedMetrics}
          existingCardIds={existingCardIds}
          toggleSelection={toggleMetricSelection}
          allSelected={cards.length === selectedMetrics.length}
          toggleAll={({ target: { checked, name } }) =>
            setSelectedMetrics(
              checked
              ? cards
                .map((i: any) => i.metricId)
                .slice(0, 30 - existingCardIds!.length)
              : []
            )
          }
          showOwn={showOwn}
          toggleOwn={toggleOwn}
        />
      </NoContent>
    </Loader>
  );
}

export default observer(MetricsList);
