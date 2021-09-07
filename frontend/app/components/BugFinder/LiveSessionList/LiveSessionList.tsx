import React, { useEffect } from 'react';
import { fetchList } from 'Duck/sessions';
import { connect } from 'react-redux';
import { NoContent, Loader } from 'UI';
import { List, Map } from 'immutable';
import SessionItem from 'Shared/SessionItem';

interface Props {
  loading: Boolean,
  list?: List<any>,  
  fetchList: (params) => void,
  filters: List<any>
}

function LiveSessionList(props: Props) {
  const { loading, list, filters } = props;  

  useEffect(() => {     
    props.fetchList(filters.toJS());
  }, [])

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
  filters: state.getIn([ 'filters', 'appliedFilter' ]),
}), { fetchList })(LiveSessionList)
