import React, { useEffect } from 'react';
import { NoContent, Loader, Pagination, Icon } from 'UI';
import SessionItem from 'Shared/SessionItem';
import withPermissions from 'HOCs/withPermissions';
import { KEYS } from 'Types/filter/customFilter';
import { FilterKey } from 'App/types/filter/filterType';
import Select from 'Shared/Select';
import SortOrderButton from 'Shared/SortOrderButton';
import { capitalize, numberWithCommas } from 'App/utils';
import LiveSessionReloadButton from 'Shared/LiveSessionReloadButton';
import cn from 'classnames';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

const AUTOREFRESH_INTERVAL = 2 * 60 * 1000;
const PER_PAGE = 10;

function LiveSessionList() {
  const { searchStoreLive, sessionStore, customFieldStore } = useStore();
  const filter = searchStoreLive.instance;
  const list = sessionStore.liveSessions;
  const { totalLiveSessions } = sessionStore;
  const loading = sessionStore.loadingLiveSessions;
  const { currentPage } = searchStoreLive;
  const metaList = customFieldStore.list;
  const metaListLoading = customFieldStore.isLoading;
  const { t } = useTranslation();

  let timeoutId: any;
  const { filters } = filter;
  const hasUserFilter = filters.map((i: any) => i.key).includes(KEYS.USERID);
  const sortOptions = [
    { label: 'Start Time', value: 'timestamp' },
    { label: 'Duration', value: 'duration' },
  ].concat(
    metaList.map(({ key }: any) => ({
      label: capitalize(key),
      value: key,
    })),
  );

  useEffect(() => {
    if (metaListLoading) return;

    const _filter = { ...filter };
    let shouldUpdate = false;

    // Set default sort if not already set
    if (sortOptions[1] && !filter.sort) {
      _filter.sort = sortOptions[1].value;
      shouldUpdate = true;
    }

    // Only update filters if there's a change
    if (shouldUpdate) {
      searchStoreLive.edit(_filter);
    }

    // Start auto-refresh timeout
    timeout();

    // Cleanup on component unmount or re-run
    return () => {
      clearTimeout(timeoutId);
    };
  }, [metaListLoading, filter.sort]); // Add necessary dependencies

  const refetch = () => {
    void searchStoreLive.fetchSessions();
  };

  const onUserClick = (userId: string, userAnonymousId: string) => {
    if (userId) {
      searchStoreLive.addFilterByKeyAndValue(FilterKey.USERID, userId);
    } else {
      searchStoreLive.addFilterByKeyAndValue(
        FilterKey.USERANONYMOUSID,
        userAnonymousId,
      );
    }
  };

  const onSortChange = ({ value }: any) => {
    searchStoreLive.edit({ sort: value.value });
  };

  const timeout = () => {
    timeoutId = setTimeout(() => {
      refetch();
      timeout();
    }, AUTOREFRESH_INTERVAL);
  };

  return (
    <div>
      <div className="bg-white py-3 rounded-lg border shadow-sm">
        <div className="flex mb-4 pb-2 px-3 justify-between items-center border-b border-b-gray-lighter">
          <LiveSessionReloadButton onClick={refetch} />
          <div className="flex items-center">
            <div className="flex items-center ml-6">
              <span className="mr-2 color-gray-medium">{t('Sort By')}</span>
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

                <div className="mx-2" />
                <SortOrderButton
                  onChange={(state: any) => {
                    searchStoreLive.edit({ order: state });
                  }}
                  sortOrder={filter.order}
                />
              </div>
            </div>
          </div>
        </div>
        <Loader loading={loading}>
          <NoContent
            title={
              <div className="flex items-center justify-center flex-col">
                <AnimatedSVG name={ICONS.NO_LIVE_SESSIONS} size={60} />
                <div className="mt-4" />
                <div className="text-center  text-lg font-medium">
                  {t('No live sessions found')}
                </div>
              </div>
            }
            subtext={
              <div className="text-center flex justify-center items-center flex-col">
                <span>
                  {t(
                    'Support users with live sessions, cobrowsing, and video calls.',
                  )}
                  <a
                    target="_blank"
                    className="link ml-1"
                    href="https://docs.openreplay.com/plugins/assist"
                    rel="noreferrer"
                  >
                    {t('Learn More')}
                  </a>
                </span>

                <Button
                  variant="text"
                  className="mt-4"
                  icon={<Icon name="arrow-repeat" size={20} />}
                  onClick={refetch}
                >
                  {t('Refresh')}
                </Button>
              </div>
            }
            // image={<img src="/assets/img/live-sessions.png" style={{ width: '70%', marginBottom: '30px' }} />}
            show={!loading && list.length === 0}
          >
            <div>
              {list.map((session) => (
                <React.Fragment key={session.sessionId}>
                  <SessionItem
                    session={session}
                    live
                    hasUserFilter={hasUserFilter}
                    onUserClick={onUserClick}
                    metaList={metaList}
                  />
                  <div className="border-b" />
                </React.Fragment>
              ))}
            </div>
            <div
              className={cn('flex items-center justify-between p-5', {
                disabled: loading,
              })}
            >
              <div>
                {t('Showing')}{' '}
                <span className="font-medium">
                  {(currentPage - 1) * PER_PAGE + 1}
                </span>{' '}
                {t('to')}{' '}
                <span className="font-medium">
                  {(currentPage - 1) * PER_PAGE + list.length}
                </span>{' '}
                {t('of')}{' '}
                <span className="font-medium">
                  {numberWithCommas(totalLiveSessions)}
                </span>{' '}
                {t('sessions.')}
              </div>
              <Pagination
                page={currentPage}
                total={totalLiveSessions}
                onPageChange={(page: any) =>
                  searchStoreLive.updateCurrentPage(page)
                }
                limit={PER_PAGE}
                debounceRequest={500}
              />
            </div>
          </NoContent>
        </Loader>
      </div>
    </div>
  );
}

export default withPermissions(
  ['ASSIST_LIVE', 'SERVICE_ASSIST_LIVE'],
  '',
  false,
  false,
)(observer(LiveSessionList));
