import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { applyFilter, addAttribute } from 'Duck/filters';
import { fetchList } from 'Duck/sessions';
import { KEYS } from 'Types/filter/customFilter';
import { Link, Loader } from 'UI';
import Filter from 'Types/filter';
import { List } from 'immutable';
import Counter from 'App/components/shared/SessionItem/Counter';
import { fetchLiveList } from 'Duck/sessions';
import { session as sessionRoute } from 'App/routes';
import { session } from 'App/components/Session_/session.css';

const RowItem = ({ startedAt, sessionId }) => {
  return (
    <Link to={ sessionRoute(sessionId) }>
      <div className="flex justify-between p-2 cursor-pointer">
        Tab1
        <Counter startTime={startedAt} />
      </div>
    </Link>
  );
}

interface Props {
  list: List<any>,
  session: any,
  fetchLiveList: () => void,
  applyFilter: () => void,
  filters: Filter
  addAttribute: (obj) => void,
  loading: boolean
}

const AssistTabs = React.memo((props: Props) => {
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (showMenu) {
      props.fetchLiveList();
    }
  }, [showMenu])

  useEffect(() => {
    if (!props.loading && props.list.size === 0) {
      props.fetchLiveList();
    }
  }, [props.list])

  return (
    <div className="relative mr-4">
      <div className="p-2 cursor-pointer" onClick={() => setShowMenu(!showMenu)}>Active Tabs</div>
      {showMenu && (
        <div
          className="border z-10 absolute bg-white rounded shadow right-0"
          style={{ minWidth: "180px"}}
        >
          <Loader loading={props.loading} size="small">
            {props.list.map((item, index) => (
              <RowItem key={index} startedAt={item.startedAt} sessionId={item.sessionId} />
            ))}  
          </Loader>
        </div>
      )}
    </div>
  );
});

export default connect(state => {
  const session = state.getIn([ 'sessions', 'current' ]);
  return {
    loading: state.getIn([ 'sessions', 'fetchLiveListRequest', 'loading' ]),
    list: state.getIn(['sessions', 'liveSessions']).filter(i => i.userId === session.userId),
    session,
    filters: state.getIn([ 'filters', 'appliedFilter' ]),
  }
}, { applyFilter, addAttribute, fetchLiveList })(AssistTabs);