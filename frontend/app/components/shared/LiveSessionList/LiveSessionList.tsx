import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { NoContent, Loader, Pagination, Popup } from 'UI';
import { List } from 'immutable';
import SessionItem from 'Shared/SessionItem';
import withPermissions from 'HOCs/withPermissions';
import { KEYS } from 'Types/filter/customFilter';
import { applyFilter } from 'Duck/liveSearch';
import { FilterKey } from 'App/types/filter/filterType';
import { addFilterByKeyAndValue, updateCurrentPage } from 'Duck/liveSearch';
import Select from 'Shared/Select';
import SortOrderButton from 'Shared/SortOrderButton';
import { capitalize } from 'App/utils';
import LiveSessionReloadButton from 'Shared/LiveSessionReloadButton';
import cn from 'classnames';

const AUTOREFRESH_INTERVAL = 0.5 * 60 * 1000;
const PER_PAGE = 10;

interface Props {
    loading: boolean;
    metaListLoading: boolean;
    list: List<any>;
    // fetchLiveList: () => Promise<void>,
    applyFilter: (filter: any) => void;
    filter: any;
    // addAttribute: (obj: any) => void,
    addFilterByKeyAndValue: (key: FilterKey, value: string) => void;
    updateCurrentPage: (page: number) => void;
    currentPage: number;
    totla: number;
    metaList: any;
    sort: any;
    total: number;
}

function LiveSessionList(props: Props) {
    const { loading, metaListLoading, filter, list, currentPage, total, metaList = [], sort } = props;
    var timeoutId: any;
    const { filters } = filter;
    const hasUserFilter = filters.map((i: any) => i.key).includes(KEYS.USERID);
    const sortOptions = metaList
        .map((i: any) => ({
            label: capitalize(i),
            value: i,
        }))
        .toJS();

    // useEffect(() => {
    //   if (metaListLoading || metaList.size === 0 || !!filter.sort) return;

    //   if (sortOptions[0]) {
    //     props.applyFilter({ sort: sortOptions[0].value });
    //   }
    // }, [metaListLoading]);

    // useEffect(() => {
    //   const filteredSessions = filters.size > 0 ? props.list.filter(session => {
    //     let hasValidFilter = true;
    //     filters.forEach(filter => {
    //       if (!hasValidFilter) return;

    //       const _values = filter.value.filter(i => i !== '' && i !== null && i !== undefined).map(i => i.toLowerCase());
    //       if (filter.key === FilterKey.USERID) {
    //         const _userId = session.userId ? session.userId.toLowerCase() : '';
    //         hasValidFilter = _values.length > 0 ? (_values.includes(_userId) && hasValidFilter) || _values.some(i => _userId.includes(i)) : hasValidFilter;
    //       }
    //       if (filter.category === FilterCategory.METADATA) {
    //         const _source = session.metadata[filter.key] ? session.metadata[filter.key].toLowerCase() : '';
    //         hasValidFilter = _values.length > 0 ? (_values.includes(_source) && hasValidFilter) || _values.some(i => _source.includes(i)) : hasValidFilter;
    //       }
    //     })
    //     return hasValidFilter;
    //   }) : props.list;
    //   setSessions(filteredSessions);
    // }, [filters, list]);

    useEffect(() => {
        props.applyFilter({ ...filter });
        timeout();
        return () => {
            clearTimeout(timeoutId);
        };
    }, []);

    const onUserClick = (userId: string, userAnonymousId: string) => {
        if (userId) {
            props.addFilterByKeyAndValue(FilterKey.USERID, userId);
        } else {
            props.addFilterByKeyAndValue(FilterKey.USERANONYMOUSID, userAnonymousId);
        }
    };

    const onSortChange = ({ value }: any) => {
        props.applyFilter({ sort: value.value });
    };

    const timeout = () => {
        timeoutId = setTimeout(() => {
            props.applyFilter({ ...filter });
            timeout();
        }, AUTOREFRESH_INTERVAL);
    };

    return (
        <div>
            <div className="flex mb-6 justify-between items-end">
                <div className="flex items-baseline">
                    <h3 className="text-2xl capitalize">
                        <span>Live Sessions</span>
                        <span className="ml-2 font-normal color-gray-medium">{total}</span>
                    </h3>

                    <LiveSessionReloadButton onClick={() => props.applyFilter({ ...filter })} />
                </div>
                <div className="flex items-center">
                    <div className="flex items-center ml-6 mr-4">
                        <span className="mr-2 color-gray-medium">Sort By</span>
                        <Popup
                          content="No metadata available to sort"
                          disabled={sortOptions.length > 0}
                        >
                          <div className={ cn("flex items-center", { 'disabled': sortOptions.length === 0})} >
                            <Select
                                plain
                                right
                                options={sortOptions}
                                // defaultValue={sort.field}
                                onChange={onSortChange}
                                value={sortOptions.find((i: any) => i.value === filter.sort) || sortOptions[0]}
                            />
                            <div className="mx-2" />
                            <SortOrderButton onChange={(state: any) => props.applyFilter({ order: state })} sortOrder={filter.order} />
                          </div>
                        </Popup>
                    </div>
                </div>
            </div>
            <Loader loading={loading}>
                <NoContent
                    title={'No live sessions.'}
                    subtext={
                        <span>
                            See how to setup the{' '}
                            <a target="_blank" className="link" href="https://docs.openreplay.com/plugins/assist">
                                {'Assist'}
                            </a>{' '}
                            plugin, if you haven’t done that already.
                        </span>
                    }
                    image={<img src="/assets/img/live-sessions.png" style={{ width: '70%', marginBottom: '30px' }} />}
                    show={!loading && list.size === 0}
                >
                    <div className="bg-white p-3 rounded border">
                        {list.map((session) => (
                            <>
                                <SessionItem
                                    key={session.sessionId}
                                    session={session}
                                    live
                                    hasUserFilter={hasUserFilter}
                                    onUserClick={onUserClick}
                                    metaList={metaList}
                                />
                                <div className="border-b" />
                            </>
                        ))}

                        <div className="w-full flex items-center justify-center py-6">
                            <Pagination
                                page={currentPage}
                                totalPages={Math.ceil(total / PER_PAGE)}
                                onPageChange={(page: any) => props.updateCurrentPage(page)}
                                limit={PER_PAGE}
                            />
                        </div>
                    </div>
                </NoContent>
            </Loader>
        </div>
    );
}

export default withPermissions(['ASSIST_LIVE'])(
    connect(
        (state: any) => ({
            list: state.getIn(['liveSearch', 'list']),
            loading: state.getIn(['liveSearch', 'fetchList', 'loading']),
            metaListLoading: state.getIn(['customFields', 'fetchRequest', 'loading']),
            filter: state.getIn(['liveSearch', 'instance']),
            total: state.getIn(['liveSearch', 'total']),
            currentPage: state.getIn(['liveSearch', 'currentPage']),
            metaList: state.getIn(['customFields', 'list']).map((i: any) => i.key),
            sort: state.getIn(['liveSearch', 'sort']),
        }),
        {
            applyFilter,
            addFilterByKeyAndValue,
            updateCurrentPage,
        }
    )(LiveSessionList)
);
