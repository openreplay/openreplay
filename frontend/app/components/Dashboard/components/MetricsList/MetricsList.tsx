import { observer, useObserver } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { NoContent, Pagination, Icon } from 'UI';
import { useStore } from 'App/mstore';
import { filterList } from 'App/utils';
import { sliceListPerPage } from 'App/utils';
import Widget from 'App/mstore/types/widget';
import GridView from './GridView';
import ListView from './ListView';

function MetricsList({
  siteId,
  onSelectionChange = () => {},
}: {
  siteId: string;
  onSelectionChange?: (selected: any[]) => void;
}) {
  const { metricStore } = useStore();
  const metrics = metricStore.sortedWidgets;
  const metricsSearch = metricStore.metricsSearch;
  const listView = useObserver(() => metricStore.listView);
  const [selectedMetrics, setSelectedMetrics] = useState<any>([]);

  useEffect(() => {
    metricStore.fetchList();
  }, []);

  useEffect(() => {
    onSelectionChange(selectedMetrics);
  }, [selectedMetrics]);

  const toggleMetricSelection = (id: any) => {
    if (selectedMetrics.includes(id)) {
      setSelectedMetrics(selectedMetrics.filter((i: number) => i !== id));
    } else {
      setSelectedMetrics([...selectedMetrics, id]);
    }
  };

  const filterByDashboard = (item: Widget, searchRE: RegExp) => {
    const dashboardsStr = item.dashboards.map((d: any) => d.name).join(' ');
    return searchRE.test(dashboardsStr);
  };
  const list =
    metricsSearch !== ''
      ? filterList(metrics, metricsSearch, ['name', 'metricType', 'owner'], filterByDashboard)
      : metrics;
  const lenth = list.length;

  useEffect(() => {
    metricStore.updateKey('sessionsPage', 1);
  }, []);

  return (
    <NoContent
      show={lenth === 0}
      title={
        <div className="flex flex-col items-center justify-center">
          <Icon name="no-metrics" size={80} color="figmaColors-accent-secondary" />
          <div className="text-center text-gray-600 my-4">
            {metricsSearch !== '' ? 'No matching results' : "You haven't created any metrics yet"}
          </div>
        </div>
      }
    >
      {listView ? (
        <ListView
          siteId={siteId}
          list={sliceListPerPage(list, metricStore.page - 1, metricStore.pageSize)}
          selectedList={selectedMetrics}
          toggleSelection={toggleMetricSelection}
        />
      ) : (
        <GridView
          siteId={siteId}
          list={sliceListPerPage(list, metricStore.page - 1, metricStore.pageSize)}
          selectedList={selectedMetrics}
          toggleSelection={toggleMetricSelection}
        />
      )}
      {/*
      <div className="mt-3 rounded bg-white">
        <div className="grid grid-cols-12 py-2 font-medium px-6">
          <div className="col-span-4 flex items-center">
            <Checkbox
              name="slack"
              className="mr-4"
              type="checkbox"
              checked={false}
              onClick={() => setSelectedMetrics(list.map((i: any) => i.metricId))}
            />
            <span>Title</span>
          </div>
          <div className="col-span-4">Owner</div>
          <div className="col-span-2">Visibility</div>
          <div className="col-span-2 text-right">Last Modified</div>
        </div>

         {sliceListPerPage(list, metricStore.page - 1, metricStore.pageSize).map((metric: any) => (
          // <React.Fragment key={metric.metricId}>
          //   <MetricListItem
          //     metric={metric}
          //     siteId={siteId}
          //     selected={selectedMetrics.includes(parseInt(metric.metricId))}
          //     toggleSelection={(e: any) => {
          //       e.stopPropagation();
          //       toggleMetricSelection(parseInt(metric.metricId));
          //     }}
          //   />
          // </React.Fragment>
        ))}
      </div>
      */}

      <div className="w-full flex items-center justify-between py-4 px-6 border-t">
        <div className="text-disabled-text">
          Showing{' '}
          <span className="font-semibold">{Math.min(list.length, metricStore.pageSize)}</span> out
          of <span className="font-semibold">{list.length}</span> metrics
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
  );
}

export default observer(MetricsList);
