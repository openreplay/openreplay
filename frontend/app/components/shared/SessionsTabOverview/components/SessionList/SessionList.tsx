import React, { useEffect } from 'react';
import { FilterKey } from 'Types/filter/filterType';
import SessionItem from 'Shared/SessionItem';
import { NoContent, Loader, Pagination, Icon } from 'UI';
import { Button } from 'antd';
import { useLocation, withRouter } from 'react-router-dom';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { numberWithCommas } from 'App/utils';
import RecordingStatus from 'Shared/SessionsTabOverview/components/RecordingStatus';
import { sessionService } from 'App/services';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import SessionDateRange from './SessionDateRange';
import { useTranslation } from 'react-i18next';

type SessionStatus = {
  status: number;
  count: number;
};

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;
let sessionTimeOut: any = null;
let sessionStatusTimeOut: any = null;

const STATUS_FREQUENCY = 5000;

function SessionList() {
  const location = useLocation(); // Get the current URL location
  const isBookmark = location.pathname.includes('/bookmarks');
  const { t } = useTranslation();

  const {
    projectsStore,
    sessionStore,
    customFieldStore,
    userStore,
    searchStore,
  } = useStore();
  const { isEnterprise } = userStore;
  const { isLoggedIn } = userStore;
  const { list } = sessionStore;
  const { lastPlayedSessionId } = sessionStore;
  const loading = sessionStore.loadingSessions;
  const { total } = sessionStore;
  const onToggleFavorite = sessionStore.toggleFavorite;
  const { siteId } = projectsStore;
  const { updateProjectRecordingStatus } = projectsStore;
  const { currentPage, activeTab, pageSize } = searchStore;
  const { filters } = searchStore.instance;
  const _filterKeys = filters.map((i: any) => i.key);
  const hasUserFilter =
    _filterKeys.includes(FilterKey.USERID) || _filterKeys.includes(FilterKey.USERANONYMOUSID);
  const isVault = isBookmark && isEnterprise;
  const activeSite = projectsStore.active;
  const hasNoRecordings = !activeSite || !activeSite.recorded;
  const metaList = customFieldStore.list;

  useEffect(() => {
    if (!searchStore.urlParsed) return;
    void searchStore.checkForLatestSessionCount();
  }, [location.pathname]);

  const NO_CONTENT = React.useMemo(() => {
    if (isBookmark && !isEnterprise) {
      return {
        icon: ICONS.NO_BOOKMARKS,
        message: t('No sessions bookmarked'),
      };
    }
    if (isVault) {
      return {
        icon: ICONS.NO_SESSIONS_IN_VAULT,
        message: t('No sessions found in vault'),
      };
    }
    return {
      icon: ICONS.NO_SESSIONS,
      message: <SessionDateRange />,
    };
  }, [isBookmark, isVault, activeTab, location.pathname]);
  const [statusData, setStatusData] = React.useState<SessionStatus>({
    status: 0,
    count: 0,
  });

  const fetchStatus = async () => {
    const response = await sessionService.getRecordingStatus();
    setStatusData({
      status: response.recordingStatus,
      count: response.sessionsCount,
    });
  };

  useEffect(() => {
    if (!hasNoRecordings || !activeSite || !isLoggedIn) {
      return;
    }

    void fetchStatus();

    sessionStatusTimeOut = setInterval(() => {
      void fetchStatus();
    }, STATUS_FREQUENCY);

    return () => clearInterval(sessionStatusTimeOut);
  }, [hasNoRecordings, activeSite, isLoggedIn]);

  useEffect(() => {
    if (!hasNoRecordings && statusData.status === 0) {
      return;
    }

    // recording && processed
    if (statusData.status === 2 && siteId) {
      updateProjectRecordingStatus(siteId, true);
      clearInterval(sessionStatusTimeOut);
    }
  }, [statusData, siteId]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) {
        void searchStore.checkForLatestSessionCount();
      }
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // handle scroll position
    const { scrollY } = searchStore;
    window.scrollTo(0, scrollY);

    return () => {
      searchStore.setScrollPosition(window.scrollY);
    };
  }, []);

  const refreshOnActive = () => {
    if (document.hidden && !!sessionTimeOut) {
      clearTimeout(sessionTimeOut);
      return;
    }

    sessionTimeOut = setTimeout(function () {
      if (!document.hidden) {
        void searchStore.checkForLatestSessionCount();
      }
    }, 5000);
  };

  useEffect(() => {
    document.addEventListener('visibilitychange', refreshOnActive);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnActive);
    };
  }, []);

  const onUserClick = (userId: any) => {
    if (userId) {
      searchStore.addFilterByKeyAndValue(FilterKey.USERID, userId);
    } else {
      searchStore.addFilterByKeyAndValue(FilterKey.USERID, '', 'isUndefined');
    }
  };

  const toggleFavorite = (sessionId: string) => {
    onToggleFavorite(sessionId).then(() => {
      void searchStore.fetchSessions();
    });
  };

  return (
    <Loader loading={loading}>
      {hasNoRecordings && statusData.status == 1 ? (
        <RecordingStatus data={statusData} />
      ) : (
        <>
          <NoContent
            title={
              <div className="flex items-center justify-center flex-col">
                <span className="py-5">
                  <AnimatedSVG name={NO_CONTENT.icon} size={60} />
                </span>
                <div className="mt-4" />
                <div className="text-center relative text-lg font-medium">
                  {NO_CONTENT.message}
                </div>
              </div>
            }
            subtext={
              <div className="flex flex-col items-center">
                {(isVault || isBookmark) && (
                  <div>
                    {isVault
                      ? t(
                          'Extend the retention period of any session by adding it to your vault directly from the player screen.',
                        )
                      : t(
                          'Effortlessly find important sessions by bookmarking them directly from the player screen.',
                        )}
                  </div>
                )}
                <Button
                  variant="text"
                  className="mt-4"
                  icon={<Icon name="arrow-repeat" size={20} />}
                  onClick={() => {
                    void searchStore.fetchSessions(true, isBookmark);
                  }}
                >
                  {t('Refresh')}
                </Button>
              </div>
            }
            show={!loading && list.length === 0}
          >
            {list.map((session: any) => (
              <div key={session.sessionId} className="border-b">
                <SessionItem
                  session={session}
                  hasUserFilter={hasUserFilter}
                  onUserClick={onUserClick}
                  metaList={metaList}
                  lastPlayedSessionId={lastPlayedSessionId}
                  bookmarked={isBookmark}
                  toggleFavorite={toggleFavorite}
                />
              </div>
            ))}
          </NoContent>

          {total > 0 && (
            <div className="flex items-center justify-between p-5">
              <div>
                {t('Showing')}{' '}
                <span className="font-medium">
                  {(currentPage - 1) * pageSize + 1}
                </span>{' '}
                {t('to')}{' '}
                <span className="font-medium">
                  {(currentPage - 1) * pageSize + list.length}
                </span>{' '}
                {t('of')}{' '}
                <span className="font-medium">{numberWithCommas(total)}</span>{' '}
                {t('sessions.')}
              </div>
              <Pagination
                page={currentPage}
                total={total}
                onPageChange={(page) => searchStore.updateCurrentPage(page)}
                limit={pageSize}
                debounceRequest={1000}
              />
            </div>
          )}
        </>
      )}
    </Loader>
  );
}

export default withRouter(observer(SessionList));
