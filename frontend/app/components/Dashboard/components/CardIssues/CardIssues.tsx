import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { observer, useObserver } from 'mobx-react-lite';
import { Button, Loader, NoContent, Pagination } from 'UI';

import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import CardIssueItem from './CardIssueItem';
import SessionsModal from '../SessionsModal';
import { useModal } from 'App/components/Modal';
import Issue from 'App/mstore/types/issue';
import { List } from 'antd';

function CardIssues() {
  const { metricStore, dashboardStore } = useStore();
  const [data, setData] = useState<{
    issues: Issue[];
    total: number;
  }>({ issues: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const widget: any = useObserver(() => metricStore.instance);
  const isMounted = useIsMounted();
  const pageSize = 5;
  const { showModal } = useModal();
  const filter = useObserver(() => dashboardStore.drillDownFilter);
  const hasFilters = filter.filters.length > 0 || (filter.startTimestamp !== dashboardStore.drillDownPeriod.start || filter.endTimestamp !== dashboardStore.drillDownPeriod.end);
  const drillDownPeriod = useObserver(() => dashboardStore.drillDownPeriod);
  const depsString = JSON.stringify(widget.series);


  function getFilters(filter: any) {
    const mapSeries = (item: any) => {
      const filters = item.filter.filters
        .map((f: any) => f.toJson());

      return {
        ...item,
        filter: {
          ...item.filter,
          filters
        }
      };
    };

    return {
      ...filter,
      limit: pageSize,
      page: filter.page,
      series: filter.series.map(mapSeries)
    };
  }

  const fetchIssues = async (filter: any) => {
    if (!isMounted()) return;

    setLoading(true);

    const newFilter = getFilters(filter);

    try {
      const res = await widget.fetchIssues(newFilter);
      setData(res);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const debounceRequest: any = React.useCallback(debounce(fetchIssues, 1000), []);

  const handleClick = (issue?: any) => {
    // const filters = getFilters(widget.filter);
    showModal(<SessionsModal issue={issue} />, { right: true, width: 900 });
  };

  useEffect(() => {
    const newPayload = {
      ...widget,
      page: filter.page,
      limit: filter.limit,
      filters: filter.filters
    };
    debounceRequest(newPayload);
  }, [drillDownPeriod, filter.filters, depsString, metricStore.sessionsPage, filter.page]);

  const clearFilters = () => {
    metricStore.updateKey('page', 1);
    dashboardStore.resetDrillDownFilter();
  };

  return useObserver(() => (
    <div className="bg-white rounded p-4 border">
      <div className="flex justify-between">
        <div className="flex items-center">
          <h1 className="font-medium text-2xl">Issues</h1>
          {!!filter.filters[1] && (
            <div className="text-disabled-text ml-3">
              Showing issues of <span className="font-medium">{filter.filters[0].value}</span>
              <span className="mx-1">to</span>
              <span className="font-medium">{filter.filters[1].value}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {hasFilters && <Button variant="text-primary" onClick={clearFilters}>Clear Filters</Button>}
          <Button variant="text-primary" onClick={() => handleClick()}>All Sessions</Button>
        </div>
      </div>

      <Loader loading={loading}>
        <NoContent show={data.issues.length == 0} title="No data!">
          {/*{data.issues.map((item: any, index: any) => (*/}
          {/*  <div onClick={() => handleClick(item)} key={index}>*/}
          {/*    <CardIssueItem issue={item} />*/}
          {/*  </div>*/}
          {/*))}*/}
          <List
            itemLayout="horizontal"
            dataSource={data.issues}
            renderItem={(item: any) => (
              <List.Item onClick={() => handleClick(item)}>
                <CardIssueItem issue={item} />
              </List.Item>
            )}/>
        </NoContent>
      </Loader>

      <div className="w-full flex items-center justify-between pt-4">
        <div className="text-disabled-text">
          {data.total && (
            <>
              Showing < span className="font-medium">{(filter.page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium">{(filter.page - 1) * pageSize + pageSize}</span> of{' '}
              <span className="font-medium">{data.total}</span> issues.
            </>
          )}
        </div>

        <Pagination
          page={filter.page}
          total={data.total}
          onPageChange={(page: any) => filter.updateKey('page', page)}
          limit={widget.limit}
          debounceRequest={500}
        />
      </div>
    </div>
  ));
}

export default observer(CardIssues);
