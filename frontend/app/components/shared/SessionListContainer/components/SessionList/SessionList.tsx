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
  checkForLatestSessions,
} from 'Duck/search';
import { numberWithCommas } from 'App/utils';
import { fetchListActive as fetchMetadata } from 'Duck/customField';
import { toggleFavorite } from 'Duck/sessions';

enum NoContentType {
  Bookmarked,
  Vaulted,
  ToDate,
}

const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;
let sessionTimeOut: any = null;
interface Props extends RouteComponentProps {
  loading: boolean;
  list: any;
  currentPage: number;
  pageSize: number;
  total: number;
  filters: any;
  lastPlayedSessionId: string;
  metaList: any;
  scrollY: number;
  addFilterByKeyAndValue: (key: string, value: any, operator?: string) => void;
  updateCurrentPage: (page: number) => void;
  setScrollPosition: (scrollPosition: number) => void;
  fetchSessions: (filters: any, force: boolean) => void;
  fetchMetadata: () => void;
  activeTab: any;
  isEnterprise?: boolean;
  checkForLatestSessions: () => void;
  toggleFavorite: (sessionId: string) => Promise<void>;
}
function SessionList(props: Props) {
  const [noContentType, setNoContentType] = React.useState<NoContentType>(NoContentType.ToDate);
  const {
    loading,
    list,
    currentPage,
    pageSize,
    total,
    filters,
    lastPlayedSessionId,
    metaList,
    activeTab,
    isEnterprise = false,
  } = props;
  const _filterKeys = filters.map((i: any) => i.key);
  const hasUserFilter =
    _filterKeys.includes(FilterKey.USERID) || _filterKeys.includes(FilterKey.USERANONYMOUSID);
  const isBookmark = activeTab.type === 'bookmark';
  const isVault = isBookmark && isEnterprise;
  const NO_CONTENT = React.useMemo(() => {
    if (isBookmark && !isEnterprise) {
      setNoContentType(NoContentType.Bookmarked);
      return {
        icon: ICONS.NO_BOOKMARKS,
        message: 'No sessions bookmarked.',
      };
    } else if (isVault) {
      setNoContentType(NoContentType.Vaulted);
      return {
        icon: ICONS.NO_SESSIONS_IN_VAULT,
        message: 'No sessions found in vault.',
      };
    }
    setNoContentType(NoContentType.ToDate);
    return {
      icon: ICONS.NO_SESSIONS,
      message: 'No relevant sessions found for the selected time period.',
    };
  }, [isBookmark, isVault, activeTab]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) {
        props.checkForLatestSessions()
      }
    }, AUTOREFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // handle scroll position
    const { scrollY } = props;
    window.scrollTo(0, scrollY);
    if (total === 0) {
      setTimeout(() => {
        props.fetchSessions(null, true);
      }, 300);
    }
    props.fetchMetadata();

    return () => {
      props.setScrollPosition(window.scrollY);
    };
  }, []);

  const refreshOnActive = () => {
    if (document.hidden && !!sessionTimeOut) {
      clearTimeout(sessionTimeOut);
      return;
    }

    sessionTimeOut = setTimeout(function () {
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
    props.toggleFavorite(sessionId).then(() => {
      props.fetchSessions(null, true);
    });
  };

  return (
    <Loader loading={loading}>
      <NoContent
        title={
          <div className="flex items-center justify-center flex-col">
            <AnimatedSVG name={NO_CONTENT.icon} size={180} />
            <div className="mt-4" />
            <div className="text-center relative">
              {NO_CONTENT.message}
              {noContentType === NoContentType.ToDate ? (
                <div style={{ position: 'absolute', right: -160, top: -170 }}>
                  <Icon name="pointer-sessions-search" size={250} width={240} />
                </div>
              ) : null}
            </div>
          </div>
        }
        subtext={
          <div className="flex flex-col items-center">
            {(isVault || isBookmark) && (
              <div>
                {isVault
                  ? 'Add any session to your vault from the replay page and retain it longer.'
                  : 'Bookmark important sessions in player screen and quickly find them here.'}
              </div>
            )}
            <Button
              variant="text-primary"
              className="mt-4"
              icon="arrow-repeat"
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
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium">{(currentPage - 1) * pageSize + list.length}</span> of{' '}
            <span className="font-medium">{numberWithCommas(total)}</span> sessions.
          </div>
          <Pagination
            page={currentPage}
            totalPages={Math.ceil(total / pageSize)}
            onPageChange={(page) => props.updateCurrentPage(page)}
            limit={pageSize}
            debounceRequest={1000}
          />
        </div>
      )}
    </Loader>
  );
}

export default connect(
  (state: any) => ({
    list: state.getIn(['sessions', 'list']),
    filters: state.getIn(['search', 'instance', 'filters']),
    lastPlayedSessionId: state.getIn(['sessions', 'lastPlayedSessionId']),
    metaList: state.getIn(['customFields', 'list']).map((i: any) => i.key),
    loading: state.getIn(['sessions', 'loading']),
    currentPage: state.getIn(['search', 'currentPage']) || 1,
    total: state.getIn(['sessions', 'total']) || 0,
    scrollY: state.getIn(['search', 'scrollY']),
    activeTab: state.getIn(['search', 'activeTab']),
    pageSize: state.getIn(['search', 'pageSize']),
    isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
  }),
  {
    updateCurrentPage,
    addFilterByKeyAndValue,
    setScrollPosition,
    fetchSessions,
    fetchMetadata,
    checkForLatestSessions,
    toggleFavorite,
  }
)(withRouter(SessionList));
