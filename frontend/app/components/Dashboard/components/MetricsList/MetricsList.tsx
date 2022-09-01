import { useObserver } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { NoContent, Pagination, Icon } from 'UI';
import { useStore } from 'App/mstore';
import { filterList } from 'App/utils';
import MetricListItem from '../MetricListItem';
import { sliceListPerPage } from 'App/utils';
import { IWidget } from 'App/mstore/types/widget';

function MetricsList({ siteId }: { siteId: string }) {
  const { metricStore } = useStore();
  const metrics = useObserver(() => metricStore.metrics);
  const metricsSearch = useObserver(() => metricStore.metricsSearch);

  const filterByDashboard = (item: IWidget, searchRE: RegExp) => {
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

  return useObserver(() => (
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
      <div className="mt-3 border-b rounded bg-white">
        <div className="grid grid-cols-12 py-2 font-medium px-6">
          <div className="col-span-4">Title</div>
          <div className="col-span-4">Owner</div>
          <div className="col-span-2">Visibility</div>
          <div className="col-span-2 text-right">Last Modified</div>
        </div>

        {sliceListPerPage(list, metricStore.page - 1, metricStore.pageSize).map((metric: any) => (
          <React.Fragment key={metric.metricId}>
            <MetricListItem metric={metric} siteId={siteId} />
          </React.Fragment>
        ))}
      </div>

      <div className="w-full flex items-center justify-between pt-4 px-6">
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
  ));
}

export default MetricsList;
