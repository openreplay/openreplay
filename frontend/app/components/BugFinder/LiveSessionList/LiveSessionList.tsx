import React, { useEffect } from 'react';
import { fetchLiveList } from 'Duck/sessions';
import { connect } from 'react-redux';
import { NoContent, Loader } from 'UI';
import { List } from 'immutable';
import SessionItem from 'Shared/SessionItem';

interface Props {
  loading: Boolean,
  list?: List<any>,
  fetchLiveList: () => void
}

function LiveSessionList(props: Props) {
  const { loading, list } = props;

  useEffect(() => {
    props.fetchLiveList();
  }, [])

  return (
    <div>
      <NoContent
        title={"No live sessions!"}
        subtext="Please try changing your search parameters."
        icon="exclamation-circle"
        show={ !loading && list && list.size === 0}
      >
        <Loader loading={ loading }>
          {list?.map(session => (
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
}), { fetchLiveList })(LiveSessionList)
