import React, { useEffect } from 'react';
import { fetchLiveList } from 'Duck/sessions';
import { connect } from 'react-redux';
import { NoContent, Loader, LoadMoreButton } from 'UI';
import { List, Map } from 'immutable';
import SessionItem from 'Shared/SessionItem';
import withPermissions from 'HOCs/withPermissions'
import { KEYS } from 'Types/filter/customFilter';
import { applyFilter, addAttribute } from 'Duck/filters';
import { FilterCategory, FilterKey } from 'App/types/filter/filterType';
import { addFilterByKeyAndValue, updateCurrentPage, updateSort } from 'Duck/liveSearch';
import DropdownPlain from 'Shared/DropdownPlain';
import SortOrderButton from 'Shared/SortOrderButton';
import { TimezoneDropdown } from 'UI';
import { capitalize } from 'App/utils';
import LiveSessionReloadButton from 'Shared/LiveSessionReloadButton';

const AUTOREFRESH_INTERVAL = .5 * 60 * 1000
const PER_PAGE = 20;

interface Props {
  loading: Boolean,
  list: List<any>,  
  fetchLiveList: () => Promise<void>,
  applyFilter: () => void,
  filters: any,
  addAttribute: (obj) => void,
  addFilterByKeyAndValue: (key: FilterKey, value: string) => void,
  updateCurrentPage: (page: number) => void,
  currentPage: number, 
  metaList: any,
  updateSort: (sort: any) => void,
  sort: any,
}

function LiveSessionList(props: Props) {
  const { loading, filters, list, currentPage, metaList = [], sort } = props;
  var timeoutId;
  const hasUserFilter = filters.map(i => i.key).includes(KEYS.USERID);
  const [sessions, setSessions] = React.useState(list);
  const sortOptions = metaList.map(i => ({
    text: capitalize(i), value: i
  })).toJS();
  
  const displayedCount = Math.min(currentPage * PER_PAGE, sessions.size);

  const addPage = () => props.updateCurrentPage(props.currentPage + 1)

  useEffect(() => {
    if (filters.size === 0) {
      props.addFilterByKeyAndValue(FilterKey.USERID, '');
    }
  }, []);

  useEffect(() => {
    if (metaList.size === 0 || !!sort.field) return;

    if ( sortOptions[0]) {
      props.updateSort({ field: sortOptions[0].value });
    }
  }, [metaList]);

  useEffect(() => {
    const filteredSessions = filters.size > 0 ? props.list.filter(session => {
      let hasValidFilter = true;
      filters.forEach(filter => {
        if (!hasValidFilter) return;

        const _values = filter.value.filter(i => i !== '' && i !== null && i !== undefined).map(i => i.toLowerCase());
        if (filter.key === FilterKey.USERID) {
          const _userId = session.userId ? session.userId.toLowerCase() : '';
          hasValidFilter = _values.length > 0 ? (_values.includes(_userId) && hasValidFilter) || _values.some(i => _userId.includes(i)) : hasValidFilter;
        } 
        if (filter.category === FilterCategory.METADATA) {
          const _source = session.metadata[filter.key] ? session.metadata[filter.key].toLowerCase() : '';
          hasValidFilter = _values.length > 0 ? (_values.includes(_source) && hasValidFilter) || _values.some(i => _source.includes(i)) : hasValidFilter;
        }
      })
      return hasValidFilter;
    }) : props.list;
    setSessions(filteredSessions);
  }, [filters, list]);

  useEffect(() => {     
    props.fetchLiveList();
    timeout();
    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  const onUserClick = (userId, userAnonymousId) => {
    if (userId) {
      props.addFilterByKeyAndValue(FilterKey.USERID, userId);
    } else {
      props.addFilterByKeyAndValue(FilterKey.USERANONYMOUSID, userAnonymousId);
    }
  }

  const onSortChange = (e, { value }) => {
    props.updateSort({ field: value });
  }

  const timeout = () => {
    timeoutId = setTimeout(() => {
      props.fetchLiveList();
      timeout();
    }, AUTOREFRESH_INTERVAL);
  }

  return (
    <div>
      <div className="flex mb-6 justify-between items-end">
        <div className="flex items-baseline">
          <h3 className="text-2xl capitalize">
            <span>Live Sessions</span>
            <span className="ml-2 font-normal color-gray-medium">{sessions.size}</span>
          </h3>

          <LiveSessionReloadButton />
        </div>
        <div className="flex items-center">
          <div className="flex items-center">
            <span className="mr-2 color-gray-medium">Timezone</span>
            <TimezoneDropdown />
          </div>
          <div className="flex items-center ml-6 mr-4">
            <span className="mr-2 color-gray-medium">Sort By</span>
            <DropdownPlain
              options={sortOptions}
              onChange={onSortChange}
              value={sort.field}
            />
          </div>
          <SortOrderButton onChange={(state) => props.updateSort({ order: state })} sortOrder={sort.order} />
        </div>
      </div>
      <NoContent
        title={"No live sessions."}
        subtext={
          <span>
            See how to <a target="_blank" className="link" href="https://docs.openreplay.com/plugins/assist">{'enable Assist'}</a> and ensure you're using tracker-assist <span className="font-medium">v3.5.0</span> or higher.
          </span>
        }
        image={<img src="/img/live-sessions.png"
        style={{ width: '70%', marginBottom: '30px' }}/>}
        show={ !loading && sessions && sessions.size === 0}
      >
        <Loader loading={ loading }>
          {sessions && sessions.sortBy(i => i.metadata[sort.field]).update(list => {
            return sort.order === 'desc' ? list.reverse() : list;
          }).take(displayedCount).map(session => (
            <SessionItem
              key={ session.sessionId }
              session={ session }
              live
              hasUserFilter={hasUserFilter}
              onUserClick={onUserClick}
              metaList={metaList}
            />
          ))}

          <LoadMoreButton
            className="my-6"
            displayedCount={displayedCount}
            totalCount={sessions.size}
            onClick={addPage}
          />
        </Loader>
      </NoContent>
    </div>
  )
}

export default withPermissions(['ASSIST_LIVE'])(connect(
  (state) => ({
    list: state.getIn(['sessions', 'liveSessions']),
    loading: state.getIn([ 'sessions', 'loading' ]),
    filters: state.getIn([ 'liveSearch', 'instance', 'filters' ]),
    currentPage: state.getIn(["liveSearch", "currentPage"]),
    metaList: state.getIn(['customFields', 'list']).map(i => i.key),
    sort: state.getIn(['liveSearch', 'sort']),
  }),
  { 
    fetchLiveList,
    applyFilter,
    addAttribute,
    addFilterByKeyAndValue,
    updateCurrentPage,
    updateSort,
  }
)(LiveSessionList));
