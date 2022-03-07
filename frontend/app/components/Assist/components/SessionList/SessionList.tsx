import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { fetchLiveList } from 'Duck/sessions';
import { Loader, NoContent, Label } from 'UI';
import SessionItem from 'Shared/SessionItem';

interface Props {
  loading: boolean,
  list: any,
  session: any,
  fetchLiveList: () => void,
}
function SessionList(props: Props) {
  useEffect(() => {
    props.fetchLiveList();
  }, [])

  return (
    <Loader loading={props.loading}>
      <NoContent 
        show={ !props.loading && (props.list.size === 0 )}
        title="No live sessions."
      >
        <div className="p-4">
          { props.list.map(session => (
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <Label size="small" className="p-1"><span className="color-gray-medium">TAB</span></Label>
                <span className="ml-2 font-medium">{session.pageTitle}</span>
              </div>
              <SessionItem key={ session.sessionId } session={ session } showActive={true} />
            </div>
          )) }
        </div>
      </NoContent>
    </Loader>
  );
}

export default connect(state => {
 const session = state.getIn([ 'sessions', 'current' ]);
 return {
  session,
  list: state.getIn(['sessions', 'liveSessions'])
    .filter(i => i.userId === session.userId && i.sessionId !== session.sessionId),
  loading: state.getIn([ 'sessions', 'fetchLiveListRequest', 'loading' ]),
 } 
}, { fetchLiveList })(SessionList);