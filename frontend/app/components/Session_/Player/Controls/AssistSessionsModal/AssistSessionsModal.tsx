import React from 'react';
import { Loader, Pagination, Tooltip, Icon } from 'UI';
import SessionItem from 'Shared/SessionItem';
import Select from 'Shared/Select';
import SortOrderButton from 'Shared/SortOrderButton';
import { KEYS } from 'Types/filter/customFilter';
import { capitalize } from 'App/utils';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import AssistSearchActions from 'App/components/Assist/AssistSearchActions';
import LiveSessionSearch from 'Shared/LiveSessionSearch';
import cn from 'classnames';
import Session from 'App/mstore/types/session';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

const PER_PAGE = 10;

interface ConnectProps {
  onAdd: () => void;
  replaceTarget?: string;
}

function AssistSessionsModal(props: ConnectProps) {
  const {
    assistMultiviewStore,
    customFieldStore,
    searchStoreLive,
    sessionStore,
  } = useStore();
  const { t } = useTranslation();
  const loading = sessionStore.loadingLiveSessions;
  const list = sessionStore.liveSessions;
  const filter = searchStoreLive.instance;
  const { currentPage } = searchStoreLive;
  const total = sessionStore.totalLiveSessions;
  const onUserClick = () => false;
  const { filters } = filter;
  const hasUserFilter = filters.map((i: any) => i.key).includes(KEYS.USERID);
  const metaList = customFieldStore.list;

  const sortOptions = metaList.map((i: any) => ({
    label: capitalize(i.key),
    value: i.key,
  }));

  React.useEffect(() => {
    if (total === 0) {
      reloadSessions();
    }
    // fetchMeta();
    customFieldStore.fetchList();
  }, []);
  const reloadSessions = () => searchStoreLive.edit({ ...filter });
  const onSortChange = ({ value }: any) => {
    searchStoreLive.edit({ sort: value.value });
  };
  const onSessionAdd = (session: Session) => {
    if (props.replaceTarget) {
      assistMultiviewStore.replaceSession(props.replaceTarget, session);
    } else {
      assistMultiviewStore.addSession(session);
    }
    assistMultiviewStore
      .fetchAgentTokenInfo(session.sessionId)
      .then(() => props.onAdd());
  };

  return (
    <div className="bg-gray-lightest box-shadow h-screen p-4">
      <div className="flex flex-col my-2 w-full gap-2 ">
        <div className="flex items-center gap-2 w-full">
          <Tooltip title={t('Refresh')} placement="top" delay={200}>
            <Button
              loading={loading}
              className="mr-2"
              type="text"
              onClick={reloadSessions}
              icon={<Icon name="arrow-repeat" />}
            />
          </Tooltip>
          <AssistSearchActions />
        </div>
        <div className="flex self-end items-center gap-2" w-full>
          <span className="color-gray-medium">{t('Sort By')}</span>
          <Tooltip
            title={t('No metadata available to sort')}
            disabled={sortOptions.length > 0}
          >
            <div
              className={cn('flex items-center', {
                disabled: sortOptions.length === 0,
              })}
            >
              <Select
                plain
                right
                options={sortOptions}
                onChange={onSortChange}
                value={
                  sortOptions.find((i: any) => i.value === filter.sort) ||
                  sortOptions[0]
                }
              />
              <SortOrderButton
                onChange={(state: any) =>
                  searchStoreLive.edit({ order: state })
                }
                sortOrder={filter.order}
              />
            </div>
          </Tooltip>
        </div>
      </div>
      <LiveSessionSearch />
      <div className="my-4" />
      <Loader loading={loading}>
        <div className="overflow-y-scroll" style={{ maxHeight: '85vh' }}>
          {list.map((session) => (
            <React.Fragment key={session.sessionId}>
              <div
                className={cn(
                  'rounded bg-white mb-2 overflow-hidden border',
                  assistMultiviewStore.sessions.findIndex(
                    (s: Record<string, any>) =>
                      s.sessionId === session.sessionId,
                  ) !== -1
                    ? 'cursor-not-allowed opacity-60'
                    : '',
                )}
              >
                <SessionItem
                  key={session.sessionId}
                  session={session}
                  live
                  hasUserFilter={hasUserFilter}
                  onUserClick={onUserClick}
                  metaList={metaList}
                  isDisabled={
                    assistMultiviewStore.sessions.findIndex(
                      (s: Record<string, any>) =>
                        s.sessionId === session.sessionId,
                    ) !== -1
                  }
                  isAdd
                  onClick={() => onSessionAdd(session)}
                />
              </div>
            </React.Fragment>
          ))}
        </div>
      </Loader>

      {total > PER_PAGE && (
        <div className="w-full flex items-center justify-center py-6">
          <Pagination
            page={currentPage}
            total={total}
            onPageChange={(page: any) =>
              searchStoreLive.updateCurrentPage(page)
            }
            limit={PER_PAGE}
          />
        </div>
      )}
    </div>
  );
}

export default observer(AssistSessionsModal);
