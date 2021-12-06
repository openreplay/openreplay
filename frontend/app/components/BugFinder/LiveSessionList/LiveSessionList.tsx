import React, { useEffect } from 'react';
import { fetchList } from 'Duck/sessions';
import { connect } from 'react-redux';
import { NoContent, Loader } from 'UI';
import { List, Map } from 'immutable';
import SessionItem from 'Shared/SessionItem';
import withPermissions from 'HOCs/withPermissions'
import { KEYS } from 'Types/filter/customFilter';
import { applyFilter, addAttribute } from 'Duck/filters';
import Filter from 'Types/filter';

const AUTOREFRESH_INTERVAL = .5 * 60 * 1000

interface Props {
  loading: Boolean,
  list?: List<any>,  
  fetchList: (params) => void,
  applyFilter: () => void,
  filters: Filter
  addAttribute: (obj) => void,
}

function LiveSessionList(props: Props) {
  const { loading, list, filters } = props;  
  var timeoutId;
  const hasUserFilter = filters && filters.filters.map(i => i.key).includes(KEYS.USERID);

  useEffect(() => {     
    props.fetchList(filters.toJS());
    timeout();
    return () => {
      clearTimeout(timeoutId)
    }
  }, [])

  const onUserClick = (userId, userAnonymousId) => {
    if (userId) {
      props.addAttribute({ label: 'User Id', key: KEYS.USERID, type: KEYS.USERID, operator: 'is', value: userId })
    } else {
      props.addAttribute({ label: 'Anonymous ID', key: 'USERANONYMOUSID', type: "USERANONYMOUSID", operator: 'is', value: userAnonymousId  })
    }

    props.applyFilter()
  }

  const timeout = () => {
    timeoutId = setTimeout(() => {
      props.fetchList(filters.toJS());
      timeout();
    }, AUTOREFRESH_INTERVAL);
  }

  return (
    <div>
      <NoContent
        title={"No live sessions."}
        subtext={
          <span>
            See how to <a target="_blank" className="link" href="https://docs.openreplay.com/plugins/assist">{'enable Assist'}</a> if you haven't yet done so.
          </span>
        }
        image={<img src="/img/live-sessions.png" style={{ width: '70%', marginBottom: '30px' }}/>}
        show={ !loading && list && list.size === 0}
      >
        <Loader loading={ loading }>
          {list && list.map(session => (
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
    filters: state.getIn([ 'filters', 'appliedFilter' ]),
  }),
  {
    fetchList, applyFilter, addAttribute }
)(LiveSessionList));
