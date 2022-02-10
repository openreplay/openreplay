import React, { useEffect } from 'react';
import { fetchLiveList } from 'Duck/sessions';
import { connect } from 'react-redux';
import { NoContent, Loader } from 'UI';
import { List, Map } from 'immutable';
import SessionItem from 'Shared/SessionItem';
import withPermissions from 'HOCs/withPermissions'
import { KEYS } from 'Types/filter/customFilter';
import { applyFilter, addAttribute } from 'Duck/filters';
import { FilterCategory, FilterKey } from 'App/types/filter/filterType';
import { addFilterByKeyAndValue } from 'Duck/liveSearch';

const AUTOREFRESH_INTERVAL = .5 * 60 * 1000

interface Props {
  loading: Boolean,
  list: List<any>,  
  fetchLiveList: () => Promise<void>,
  applyFilter: () => void,
  filters: any,
  addAttribute: (obj) => void,
  addFilterByKeyAndValue: (key: FilterKey, value: string) => void,
}

function LiveSessionList(props: Props) {
  const { loading, filters, list } = props;
  var timeoutId;
  const hasUserFilter = filters.map(i => i.key).includes(KEYS.USERID);
  const [sessions, setSessions] = React.useState(list);

  useEffect(() => {
    if (filters.size === 0) {
      props.addFilterByKeyAndValue(FilterKey.USERID, '');
    }
  }, []);

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

  const timeout = () => {
    timeoutId = setTimeout(() => {
      props.fetchLiveList();
      timeout();
    }, AUTOREFRESH_INTERVAL);
  }

  return (
    <div>
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
          {sessions && sessions.map(session => (
            <SessionItem
              key={ session.sessionId }
              session={ session }
              live
              hasUserFilter={hasUserFilter}
              onUserClick={onUserClick}
            />
          ))}
        </Loader>
      </NoContent>
    </div>
  )
}

export default withPermissions(['ASSIST_LIVE', 'SESSION_REPLAY'])(connect(
  (state) => ({
    list: state.getIn(['sessions', 'liveSessions']),
    loading: state.getIn([ 'sessions', 'loading' ]),
    filters: state.getIn([ 'liveSearch', 'instance', 'filters' ]),
  }),
  { fetchLiveList, applyFilter, addAttribute, addFilterByKeyAndValue }
)(LiveSessionList));
