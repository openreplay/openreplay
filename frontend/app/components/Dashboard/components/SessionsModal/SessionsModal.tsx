import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';

import { dashboardService, metricService } from 'App/services';
import { Loader, Modal, NoContent, Pagination } from 'UI';
import SessionItem from 'Shared/SessionItem';
import Session from 'App/mstore/types/session';
import { useModal } from 'Components/Modal';
import { useTranslation } from 'react-i18next';

interface Props {
  issue: any;
}

function SessionsModal(props: Props) {
  const { t } = useTranslation();
  const { issue } = props;
  const { metricStore, dashboardStore } = useStore();
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [list, setList] = React.useState<any>([]);
  const { hideModal } = useModal();

  const { length } = list;

  const fetchSessions = async (filter: any) => {
    setLoading(true);
    const _filter = {
      ...filter,
      filters: [...filter.filters],
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
    fetchSessions({
      ...dashboardStore.drillDownFilter,
      ...metricStore.instance.toJson(),
      limit: 10,
      page,
    });
  }, [page]);

  return (
    <div className="bg-white h-screen">
      <Modal.Header title={t('Sessions')}>
        {issue ? t('Sessions with selected issue') : t('All sessions')}
      </Modal.Header>
      <Loader loading={loading}>
        <NoContent show={length == 0} title={t('No data!')}>
          {list.map((item: any) => (
            <SessionItem session={item} onClick={hideModal} />
          ))}
        </NoContent>
      </Loader>

      <div className="w-full flex items-center justify-between p-4 absolute bottom-0 bg-white">
        <div className="text-disabled-text">
          {t('Showing')}&nbsp;
          <span className="font-medium">{Math.min(length, 10)}</span>{' '}
          {t('out of')}&nbsp;<span className="font-medium">{total}</span>&nbsp;
          {t('Issues')}
        </div>
        <Pagination
          page={page}
          total={total}
          onPageChange={(page: any) => setPage(page)}
          limit={10}
          debounceRequest={500}
        />
      </div>
    </div>
  );
}

export default SessionsModal;
