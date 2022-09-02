import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { FilterKey } from 'Types/filter/filterType';
import SessionItem from 'Shared/SessionItem';
import { NoContent, Loader, Pagination, Button } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { fetchSessions, addFilterByKeyAndValue, updateCurrentPage, setScrollPosition } from 'Duck/search';
import useTimeout from 'App/hooks/useTimeout';
import { numberWithCommas } from 'App/utils';

const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;
const PER_PAGE = 10;
interface Props {
    loading: boolean;
    list: any;
    currentPage: number;
    total: number;
    filters: any;
    lastPlayedSessionId: string;
    metaList: any;
    scrollY: number;
    addFilterByKeyAndValue: (key: string, value: any, operator?: string) => void;
    updateCurrentPage: (page: number) => void;
    setScrollPosition: (scrollPosition: number) => void;
    fetchSessions: (filters: any, force: boolean) => void;
    activeTab: any;
    isEnterprise?: boolean;
}
function SessionList(props: Props) {
    const { loading, list, currentPage, total, filters, lastPlayedSessionId, metaList, activeTab, isEnterprise = false } = props;
    const _filterKeys = filters.map((i: any) => i.key);
    const hasUserFilter = _filterKeys.includes(FilterKey.USERID) || _filterKeys.includes(FilterKey.USERANONYMOUSID);
    const isBookmark = activeTab.type === 'bookmark';
    const isVault = isBookmark && isEnterprise;
    const NO_CONTENT = React.useMemo(() => {
        if (isBookmark && !isEnterprise) {
            return {
                icon: ICONS.NO_BOOKMARKS,
                message: 'No sessions bookmarked.',
            };
        } else if (isVault) {
            return {
                icon: ICONS.NO_SESSIONS_IN_VAULT,
                message: 'No sessions found in vault.',
            };
        }
        return {
            icon: ICONS.NO_SESSIONS,
            message: 'No relevant sessions found for the selected time period.',
        };
    }, [isBookmark, isVault, activeTab]);

    useTimeout(() => {
        props.fetchSessions(null, true);
    }, AUTOREFRESH_INTERVAL);
    
    
    useEffect(() => {
        // handle scroll position
        const { scrollY } = props;
        window.scrollTo(0, scrollY);
        if (total === 0) {
            props.fetchSessions(null, true);
        }
        
        return () => {
            props.setScrollPosition(window.scrollY);
        };
    }, []);

    const onUserClick = (userId: any) => {
        if (userId) {
            props.addFilterByKeyAndValue(FilterKey.USERID, userId);
        } else {
            props.addFilterByKeyAndValue(FilterKey.USERID, '', 'isUndefined');
        }
    };

    return (
        <Loader loading={loading}>
            <NoContent
                title={
                    <div className="flex items-center justify-center flex-col">
                        <AnimatedSVG name={NO_CONTENT.icon} size={170} />
                        <div className="mt-2" />
                        <div className="text-center text-gray-600">{NO_CONTENT.message}</div>
                    </div>
                }
                subtext={
                    <div className="flex flex-col items-center">
                        {(isVault || isBookmark) && (
                            <div>
                                {isVault
                                    ? 'Add a session to your vault from player screen to retain it for ever.'
                                    : 'Bookmark important sessions in player screen and quickly find them here.'}
                            </div>
                        )}
                        <Button variant="text-primary" className="mt-4" icon="sync-alt" onClick={() => props.fetchSessions(null, true)}>
                            Refresh
                        </Button>
                    </div>
                }
                show={!loading && list.size === 0}
            >
                {list.map((session: any) => (
                    <div key={session.sessionId} className="border-b">
                        <SessionItem
                            session={session}
                            hasUserFilter={hasUserFilter}
                            onUserClick={onUserClick}
                            metaList={metaList}
                            lastPlayedSessionId={lastPlayedSessionId}
                        />
                    </div>
                ))}
            </NoContent>

            {total > 0 && (
                <div className="flex items-center justify-between p-5">
                    <div>
                        Showing <span className="font-medium">{(currentPage - 1) * PER_PAGE + 1}</span> to{' '}
                        <span className="font-medium">{(currentPage - 1) * PER_PAGE + list.size}</span> of{' '}
                        <span className="font-medium">{numberWithCommas(total)}</span> sessions.
                    </div>
                    <Pagination
                        page={currentPage}
                        totalPages={Math.ceil(total / PER_PAGE)}
                        onPageChange={(page) => props.updateCurrentPage(page)}
                        limit={PER_PAGE}
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
        isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee',
    }),
    { updateCurrentPage, addFilterByKeyAndValue, setScrollPosition, fetchSessions }
)(SessionList);
