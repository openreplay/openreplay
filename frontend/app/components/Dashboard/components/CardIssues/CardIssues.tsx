import React, { useEffect, useState } from 'react';
import { useStore } from 'App/mstore';
import { observer, useObserver } from 'mobx-react-lite';
import { Loader, Pagination, Button, NoContent } from 'UI';

import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import CardIssueItem from './CardIssueItem';
import SessionsModal from '../SessionsModal';
import { useModal } from 'App/components/Modal';
import Issue from 'App/mstore/types/issue';

function CardIssues() {
  const { metricStore, dashboardStore } = useStore();
  const [data, setData] = useState<{
    issues: Issue[];
    total: number;
  }>({ issues: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const widget: any = useObserver(() => metricStore.instance);
  const isMounted = useIsMounted();
  const { showModal } = useModal();

  const fetchIssues = async (filter: any) => {
    if (!isMounted()) return;

    setLoading(true);

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

    const newFilter = {
      ...filter,
      series: filter.series.map(mapSeries)
    };

    try {
      const res = await widget.fetchIssues(newFilter);
      setData(res);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (issue: any) => {
    showModal(<SessionsModal issue={issue} list={[]} />, { right: true, width: 900 });
  };

  const filter = useObserver(() => dashboardStore.drillDownFilter);
  const drillDownPeriod = useObserver(() => dashboardStore.drillDownPeriod);
  const debounceRequest: any = React.useCallback(debounce(fetchIssues, 1000), []);
  const depsString = JSON.stringify(widget.series);

  useEffect(() => {
    const newPayload = {
      ...widget,
      page: metricStore.sessionsPage,
      limit: metricStore.sessionsPageSize,
      filters: filter.filters
    };
    console.log('drillDownPeriod', newPayload);
    debounceRequest(newPayload);
  }, [drillDownPeriod, filter.filters, depsString, metricStore.sessionsPage]);

  return useObserver(() => (
    <div className='my-8 bg-white rounded p-4 border'>
      <div className='flex justify-between'>
        <h1 className='font-medium text-2xl'>Issues</h1>
        {/*<div>*/}
        {/*  <Button variant='text-primary'>All Sessions</Button>*/}
        {/*</div>*/}
      </div>

      <Loader loading={loading}>
        <NoContent show={data.issues.length == 0} title='No data!'>
          {data.issues.map((item: any, index: any) => (
            <div onClick={() => handleClick(item)} key={index}>
              <CardIssueItem issue={item} />
            </div>
          ))}
        </NoContent>
      </Loader>

      <div className='w-full flex items-center justify-between pt-4'>
        <div className='text-disabled-text'>
          Showing <span
          className='font-semibold'>{Math.min(data.issues.length, metricStore.sessionsPageSize)}</span> out of{' '}
          <span className='font-semibold'>{data.total}</span> Issues
        </div>
        <Pagination
          page={metricStore.sessionsPage}
          totalPages={Math.ceil(data.issues.length / metricStore.sessionsPageSize)}
          onPageChange={(page: any) => metricStore.updateKey('sessionsPage', page)}
          limit={metricStore.sessionsPageSize}
          debounceRequest={500}
        />
      </div>
    </div>
  ));
}

export default observer(CardIssues);
