import { useEffect } from 'react';
import { connect } from 'react-redux';
import usePageTitle from 'App/hooks/usePageTitle';
import { fetch as fetchSession } from 'Duck/sessions';
import { fetchList as fetchSlackList } from 'Duck/integrations/slack';
import { Link, NoContent, Loader } from 'UI';
import { sessions as sessionsRoute } from 'App/routes';
import withPermissions from 'HOCs/withPermissions'

import LivePlayer from './LivePlayer';
import WebPlayer from './WebPlayer';
import IOSPlayer from './IOSPlayer';

const SESSIONS_ROUTE = sessionsRoute();

function Session({ 
	sessionId,
	loading,
  hasErrors,
	session, 
	fetchSession,
  fetchSlackList,
  hasSessionsPath
 }) {
 	usePageTitle("OpenReplay Session Player");
 	useEffect(() => {
 		fetchSlackList()
 	}, []);
	useEffect(() => {
		if (sessionId != null) {
			fetchSession(sessionId)
		} else {
			console.error("No sessionID in route.")
		}
		return () => {
			if (!session.exists()) return;
		}
	},[ sessionId, hasSessionsPath ]);

	return (
		<NoContent
      show={ hasErrors }
      title="Session not found."
      subtext={
        <span>
          {'Please check your data retention plan, or try '}
          <Link to={ SESSIONS_ROUTE }>{'another one'}</Link>
        </span>
      }
    >
    	<Loader className="flex-1" loading={ loading || sessionId !== session.sessionId }> 
    		{ session.isIOS 
    			? <IOSPlayer session={session} />
    			: (session.live && !hasSessionsPath ? <LivePlayer /> : <WebPlayer />)
      	}
    	</Loader>
    </NoContent>
	);
}

export default withPermissions(['SESSION_REPLAY'], '', true)(connect((state, props) => {
	const { match: { params: { sessionId } } } = props;
  const isAssist = state.getIn(['sessions', 'activeTab']).type === 'live';
  const hasSessiosPath = state.getIn([ 'sessions', 'sessionPath' ]).includes('/sessions');
  return {
    sessionId,
    loading: state.getIn([ 'sessions', 'loading' ]),
    hasErrors: !!state.getIn([ 'sessions', 'errors' ]),
    session: state.getIn([ 'sessions', 'current' ]),
    hasSessionsPath: hasSessiosPath && !isAssist,
  };
}, {
  fetchSession,
  fetchSlackList,
})(Session));