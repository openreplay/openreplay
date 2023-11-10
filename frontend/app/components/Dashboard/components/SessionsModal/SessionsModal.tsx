import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';

import { dashboardService, metricService } from 'App/services';
import { Loader, Modal, NoContent, Pagination } from 'UI';
import SessionItem from 'Shared/SessionItem';
import Session from 'App/mstore/types/session';
import { useModal } from 'Components/Modal';

interface Props {
  issue: any,
}

function SessionsModal(props: Props) {
  const { issue } = props;
  const { metricStore, dashboardStore } = useStore();
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [list, setList] = React.useState<any>([]);
  const { hideModal } = useModal();

  const length = list.length;

  const fetchSessions = async (filter: any) => {
    setLoading(true);
    const _filter = {
      ...filter,
      filters: [...filter.filters]
    };

    if (issue) {
      _filter.filters.push({
        type: 'issue',
        operator: 'is',
        value: [issue.type],
        source: issue.source,
      });
    }
    const res = await metricService.fetchSessions(null, _filter);

    setList(res[0].sessions.map((item: any) => new Session().fromJson(item)));
    setTotal(res[0].total);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions({ ...dashboardStore.drillDownFilter, ...metricStore.instance.toJson(), limit: 10, page: page });
  }, [page]);

  return (
    <div className='bg-white h-screen'>
      <Modal.Header title='Sessions'>
        {issue ? 'Sessions with selected issue' : 'All sessions'}
      </Modal.Header>
      <Loader loading={loading}>
        <NoContent show={length == 0} title='No data!'>
          {list.map((item: any) => (
            <SessionItem session={item} onClick={hideModal} />
          ))}
        </NoContent>
      </Loader>

      <div className='w-full flex items-center justify-between p-4 absolute bottom-0 bg-white'>
        <div className='text-disabled-text'>
          Showing <span
          className='font-semibold'>{Math.min(length, 10)}</span> out of{' '}
          <span className='font-semibold'>{total}</span> Issues
        </div>
        <Pagination
          page={page}
          totalPages={Math.ceil(total / 10)}
          onPageChange={(page: any) => setPage(page)}
          limit={10}
          debounceRequest={500}
        />
      </div>
    </div>
  );
}

export default SessionsModal;