import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { FilterKey } from 'Types/filter/filterType';
import SessionItem from 'Shared/SessionItem';
import { NoContent, Loader, Pagination } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import NoContentMessage from '../NoContentMessage';
import { fetchSessions, addFilterByKeyAndValue, updateCurrentPage, setScrollPosition } from 'Duck/search';

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
    fetchSessions: () => void;
}
function SessionList(props: Props) {
    const { loading, list, currentPage, total, filters, lastPlayedSessionId, metaList } = props;
    const _filterKeys = filters.map((i: any) => i.key);
    const hasUserFilter = _filterKeys.includes(FilterKey.USERID) || _filterKeys.includes(FilterKey.USERANONYMOUSID);

    useEffect(() => {
        const { scrollY } = props;
        window.scrollTo(0, scrollY);
        if (total === 0) {
            props.fetchSessions()
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
                        <AnimatedSVG name={ICONS.NO_RESULTS} size={170} />
                        <div className="mt-2" />
                        <NoContentMessage />
                    </div>
                }
                subtext={<div>Please try changing your search parameters.</div>}
                show={!loading && list.size === 0}
            >
                {list.map((session: any) => (
                    <React.Fragment key={session.sessionId}>
                        <SessionItem
                            session={session}
                            hasUserFilter={hasUserFilter}
                            onUserClick={onUserClick}
                            metaList={metaList}
                            lastPlayedSessionId={lastPlayedSessionId}
                        />
                        <div className="border-b" />
                    </React.Fragment>
                ))}
            </NoContent>

            {total > 0 && (
                <div className="w-full flex items-center justify-center py-6">
                    <Pagination
                        page={currentPage}
                        totalPages={Math.ceil(total / 10)}
                        onPageChange={(page) => props.updateCurrentPage(page)}
                        limit={10}
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
    }),
    { updateCurrentPage, addFilterByKeyAndValue, setScrollPosition, fetchSessions }
)(SessionList);
