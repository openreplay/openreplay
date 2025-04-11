/* eslint-disable i18next/no-literal-string */
import React, { useEffect } from 'react';
import { useStore } from 'App/mstore';
import { FilterKey } from 'App/types/filter/filterType';
import { NoContent, Pagination, Loader, Avatar } from 'UI';
import SessionItem from 'Shared/SessionItem';
import SelectDateRange from 'Shared/SelectDateRange';
import { useObserver, observer } from 'mobx-react-lite';
import { useModal } from 'App/components/Modal';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useTranslation } from 'react-i18next';

const PER_PAGE = 10;
interface Props {
  userId: string;
  hash: string;
  name: string;
}
function SessionsModal(props: Props) {
  const { t } = useTranslation();
  const { userId, hash, name } = props;
  const { sessionStore } = useStore();
  const { hideModal } = useModal();
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<any>({ sessions: [], total: 0 });
  const filter = useObserver(() => sessionStore.userFilter);

  const onDateChange = (period: any) => {
    filter.update('period', period);
  };

  const fetchData = () => {
    setLoading(true);
    sessionStore
      .getSessions(filter)
      .then(setData)
      .catch(() => {
        console.log('error');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const userFilter = {
      key: FilterKey.USERID,
      value: [userId],
      operator: 'is',
      isEvent: false,
    };
    filter.update('filters', [userFilter]);
  }, []);
  useEffect(fetchData, [filter.page, filter.startDate, filter.endDate]);

  return (
    <div className="h-screen overflow-y-auto bg-white">
      <div className="flex items-center justify-between w-full px-5 py-3">
        <div className="text-lg flex items-center">
          <Avatar isActive={false} seed={hash} isAssist={false} />
          <div className="ml-3">
            {name}
            &apos;s
            <span className="color-gray-dark">{t('Sessions')}</span>
          </div>
        </div>
        <div>
          <SelectDateRange
            period={filter.period}
            onChange={onDateChange}
            right
          />
        </div>
      </div>

      <NoContent
        show={data.sessions.length === 0}
        title={
          <div>
            <AnimatedSVG name={ICONS.NO_SESSIONS} size={60} />
            <div className="mt-2" />
            <div className="text-center text-gray-600">
              {t('No recordings found.')}
            </div>
          </div>
        }
      >
        <div className="border rounded m-5">
          <Loader loading={loading}>
            {data.sessions.map((session: any) => (
              <div
                className="border-b last:border-none"
                key={session.sessionId}
              >
                <SessionItem
                  key={session.sessionId}
                  session={session}
                  compact
                  onClick={hideModal}
                />
              </div>
            ))}
          </Loader>

          <div className="flex flex-col items-start lg:flex-row lg:items-center lg:justify-between p-5">
            <div>
              {/* showing x to x of total sessions  */}
              {t('Showing')}{' '}
              <span className="font-medium">
                {(filter.page - 1) * PER_PAGE + 1}
              </span>{' '}
              {t('to')}{' '}
              <span className="font-medium">
                {(filter.page - 1) * PER_PAGE + data.sessions.length}
              </span>{' '}
              {t('of')}&nbsp;<span className="font-medium">{data.total}</span>
              &nbsp;{t('sessions.')}
            </div>
            <Pagination
              page={filter.page}
              total={data.total}
              onPageChange={(page) => filter.update('page', page)}
              limit={PER_PAGE}
              debounceRequest={1000}
            />
          </div>
        </div>
      </NoContent>
    </div>
  );
}

export default observer(SessionsModal);
