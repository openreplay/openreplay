import React, { useEffect, useState } from 'react';
import { fetchLiveList } from 'Duck/sessions';
import { connect } from 'react-redux';
import { NoContent, Loader } from 'UI';
import { List, Map } from 'immutable';
import SessionItem from 'Shared/SessionItem';

interface Props {
  loading: Boolean,
  list?: List<any>,
  fetchLiveList: () => void,
  filters: List<any>
}

function LiveSessionList(props: Props) {
  const { loading, list, filters } = props;
  const [userId, setUserId] = useState(undefined)

  useEffect(() => {
    props.fetchLiveList();
  }, [])

  useEffect(() => {
    console.log(filters)
    if (filters) {
      const userIdFilter = filters.filter(i => i.key === 'USERID').first()
      if (userIdFilter)
        setUserId(userIdFilter.value[0])
      else
        setUserId(undefined)
    }
  }, [filters])
  

  return (
    <div>
      <NoContent
        title={"No live sessions!"}
        subtext="Please try changing your search parameters."
        icon="exclamation-circle"
        show={ !loading && list && list.size === 0}
      >
        <Loader loading={ loading }>
          {list?.filter(i => i.userId === userId).map(session => (
            <SessionItem
              key={ session.sessionId }
              session={ session }
              live
              // hasUserFilter={hasUserFilter}
            />
          ))}
        </Loader>
      </NoContent>
    </div>
  )
}

export default connect(state => ({
  list: state.getIn(['sessions', 'liveSessions']),
  loading: state.getIn([ 'sessions', 'loading' ]),
  filters: state.getIn([ 'filters', 'appliedFilter', 'filters' ]),
}), { fetchLiveList })(LiveSessionList)
