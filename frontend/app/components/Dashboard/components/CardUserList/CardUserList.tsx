import { useModal } from 'App/components/Modal';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import { Loader, Pagination } from 'UI';
import { Button } from 'antd';
import { useStore } from 'App/mstore';
import SessionsModal from './SessionsModal';
import CardUserItem from './CardUserItem';
import { useTranslation } from 'react-i18next';

interface Props {
  history: any;
  location: any;
}
function CardUserList(props: RouteComponentProps<Props>) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const { showModal } = useModal();
  const userId = new URLSearchParams(props.location.search).get('userId');
  const { metricStore, dashboardStore } = useStore();

  const [data, setData] = useState<any>([
    { name: 'user@domain.com', sessions: 29 },
    { name: 'user@domain.com', sessions: 29 },
    { name: 'user@domain.com', sessions: 29 },
    { name: 'user@domain.com', sessions: 29 },
  ]);
  const pageSize = data.length;

  const handleClick = (issue: any) => {
    props.history.replace({
      search: new URLSearchParams({ userId: '123' }).toString(),
    });
    // showModal(<SessionsModal list={[]} />, { right: true, width: 450 })
  };

  useEffect(() => {
    if (!userId) return;

    showModal(<SessionsModal userId={userId} name="test" hash="test" />, {
      right: true,
      width: 600,
      onClose: () => {
        if (props.history.location.pathname.includes('/metric')) {
          props.history.replace({ search: '' });
        }
      },
    });
  }, [userId]);

  return (
    <div className="bg-white rounded p-4 border">
      <div className="flex justify-between">
        <h1 className="font-medium text-2xl">{t('Returning users between')}</h1>
        <div>
          <Button type="text">{t('All Sessions')}</Button>
        </div>
      </div>

      <Loader loading={loading}>
        {data.map((item: any, index: any) => (
          <div key={index} onClick={() => handleClick(item)}>
            <CardUserItem user={item} />
          </div>
        ))}
      </Loader>

      <div className="w-full flex items-center justify-between pt-4">
        <div className="text-disabled-text">
          {t('Showing')}{' '}
          <span className="font-medium">{Math.min(data.length, pageSize)}</span>{' '}
          {t('out of')}&nbsp;<span className="font-medium">{data.length}</span>
          &nbsp;{t('Issues')}
        </div>
        <Pagination
          page={metricStore.sessionsPage}
          total={data.length}
          onPageChange={(page: any) =>
            metricStore.updateKey('sessionsPage', page)
          }
          limit={metricStore.sessionsPageSize}
          debounceRequest={500}
        />
      </div>
    </div>
  );
}

export default withRouter(observer(CardUserList));
