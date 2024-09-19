import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { FilterKey } from 'Types/filter/filterType';
import SessionItem from 'Shared/SessionItem';
import { NoContent, Loader, Pagination, Button, Icon } from 'UI';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import {
  fetchSessions,
  addFilterByKeyAndValue,
  updateCurrentPage,
  setScrollPosition,
  checkForLatestSessions
} from 'Duck/search';
import { numberWithCommas } from 'App/utils';
import SessionDateRange from './SessionDateRange';
import RecordingStatus from 'Shared/SessionsTabOverview/components/RecordingStatus';
import { sessionService } from 'App/services';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

enum NoContentType {
  Bookmarked,
  Vaulted,
  ToDate,
}

type SessionStatus = {
  status: number;
  count: number;
}

const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;
let sessionTimeOut: any = null;
let sessionStatusTimeOut: any = null;

const STATUS_FREQUENCY = 5000;

interface Props extends RouteComponentProps {
  currentPage: number;
  pageSize: number;
  filters: any;
  metaList: any;
  scrollY: number;
  addFilterByKeyAndValue: (key: string, value: any, operator?: string) => void;
  updateCurrentPage: (page: number) => void;
  setScrollPosition: (scrollPosition: number) => void;
  fetchSessions: (filters: any, force: boolean) => void;
  activeTab: any;
  isEnterprise?: boolean;
  checkForLatestSessions: () => void;
  isLoggedIn: boolean;
}

function SessionList(props: Props) {
  const { projectsStore, sessionStore } = useStore();
  const list = sessionStore.list;
  const lastPlayedSessionId = sessionStore.lastPlayedSessionId;
  const loading = sessionStore.loadingSessions;
  const total = sessionStore.total;
  const onToggleFavorite = sessionStore.toggleFavorite;
  const sites = projectsStore.list;
  const siteId = projectsStore.siteId;
  const updateProjectRecordingStatus = projectsStore.updateProjectRecordingStatus;
  const [noContentType, setNoContentType] = React.useState<NoContentType>(NoContentType.ToDate);
  const {
    currentPage,
    pageSize,
    filters,
    metaList,
    activeTab,
    isEnterprise = false,
    isLoggedIn,
  } = props;
  const _filterKeys = filters.map((i: any) => i.key);
  const hasUserFilter =
    _filterKeys.includes(FilterKey.USERID) || _filterKeys.includes(FilterKey.USERANONYMOUSID);
  const isBookmark = activeTab.type === 'bookmark';
  const isVault = isBookmark && isEnterprise;
  const activeSite: any = sites.find((s: any) => s.id === siteId);
  const hasNoRecordings = !activeSite || !activeSite.recorded;


  const NO_CONTENT = React.useMemo(() => {
    if (isBookmark && !isEnterprise) {
      setNoContentType(NoContentType.Bookmarked);
      return {
        icon: ICONS.NO_BOOKMARKS,
        message: 'No sessions bookmarked'
      };
    } else if (isVault) {
      setNoContentType(NoContentType.Vaulted);
      return {
        icon: ICONS.NO_SESSIONS_IN_VAULT,
        message: 'No sessions found in vault'
      };
    }
    setNoContentType(NoContentType.ToDate);
    return {
      icon: ICONS.NO_SESSIONS,
      message: <SessionDateRange />
    };
  }, [isBookmark, isVault, activeTab]);
  const [statusData, setStatusData] = React.useState<SessionStatus>({ status: 0, count: 0 });


  const fetchStatus = async () => {
    const response = await sessionService.getRecordingStatus();
    setStatusData({
      status: response.recording_status,
      count: response.sessions_count
    });
  };


  useEffect(() => {
    if (!hasNoRecordings || !activeSite || !isLoggedIn) {
      return;
    }

    fetchStatus();

    sessionStatusTimeOut = setInterval(() => {
      fetchStatus();
    }, STATUS_FREQUENCY);

    return () => clearInterval(sessionStatusTimeOut);
  }, [hasNoRecordings, activeSite, isLoggedIn]);


  useEffect(() => {
    if (!hasNoRecordings && statusData.status === 0) {
      return;
    }

    if (statusData.status === 2 && activeSite) { // recording && processed
      updateProjectRecordingStatus(activeSite.id, true);
      props.fetchSessions(null, true);
      clearInterval(sessionStatusTimeOut);
    }
  }, [statusData, activeSite]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) {
        props.checkForLatestSessions();
      }
    }, AUTOREFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // handle scroll position
    const { scrollY } = props;
    window.scrollTo(0, scrollY);

    if (total === 0 && !loading && !hasNoRecordings) {
      setTimeout(() => {
        props.fetchSessions(null, true);
      }, 300);
    }

    return () => {
      props.setScrollPosition(window.scrollY);
    };
  }, []);

  const refreshOnActive = () => {
    if (document.hidden && !!sessionTimeOut) {
      clearTimeout(sessionTimeOut);
      return;
    }

    sessionTimeOut = setTimeout(function() {
      if (!document.hidden) {
        props.checkForLatestSessions();
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
      props.addFilterByKeyAndValue(FilterKey.USERID, userId);
    } else {
      props.addFilterByKeyAndValue(FilterKey.USERID, '', 'isUndefined');
    }
  };

  const toggleFavorite = (sessionId: string) => {
    onToggleFavorite(sessionId).then(() => {
      props.fetchSessions(null, true);
    });
  };

  return (
    <Loader loading={loading}>
      {hasNoRecordings && statusData.status == 1 ? <RecordingStatus data={statusData} /> : (
        <>
          <NoContent
            title={
              <div className='flex items-center justify-center flex-col'>
                <span className='py-5'>
                <AnimatedSVG name={NO_CONTENT.icon} size={60} />
                </span>
                <div className='mt-4' />
                <div className='text-center relative text-lg font-medium'>
                  {NO_CONTENT.message }
                </div>
              </div>
            }
            subtext={
              <div className='flex flex-col items-center'>
                {(isVault || isBookmark) && (
                  <div>
                    {isVault
                      ? 'Extend the retention period of any session by adding it to your vault directly from the player screen.'
                      : 'Effortlessly find important sessions by bookmarking them directly from the player screen.'}
                  </div>
                )}
                <Button
                  variant='text-primary'
                  className='mt-4'
                  icon='arrow-repeat'
                  iconSize={20}
                  onClick={() => props.fetchSessions(null, true)}
                >
                  Refresh
                </Button>
              </div>
            }
            show={!loading && list.length === 0}
          >
            {list.map((session: any) => (
              <div key={session.sessionId} className='border-b'>
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
            <div className='flex items-center justify-between p-5'>
              <div>
                Showing <span className='font-medium'>{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className='font-medium'>{(currentPage - 1) * pageSize + list.length}</span> of{' '}
                <span className='font-medium'>{numberWithCommas(total)}</span> sessions.
              </div>
              <Pagination
                page={currentPage}
                total={total}
                onPageChange={(page) => props.updateCurrentPage(page)}
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

export default connect(
  (state: any) => ({
    filters: state.getIn(['search', 'instance', 'filters']),
    metaList: state.getIn(['customFields', 'list']).map((i: any) => i.key),
    currentPage: state.getIn(['search', 'currentPage']) || 1,
    scrollY: state.getIn(['search', 'scrollY']),
    activeTab: state.getIn(['search', 'activeTab']),
    pageSize: state.getIn(['search', 'pageSize']),
    isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
    isLoggedIn: Boolean(state.getIn(['user', 'jwt'])),
  }),
  {
    updateCurrentPage,
    addFilterByKeyAndValue,
    setScrollPosition,
    fetchSessions,
    checkForLatestSessions,
  }
)(withRouter(observer(SessionList)));
