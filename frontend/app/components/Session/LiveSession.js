import { useEffect } from 'react';
import { connect } from 'react-redux';
import usePageTitle from 'App/hooks/usePageTitle';
import { fetch as fetchSession } from 'Duck/sessions';
import { fetchList as fetchSlackList } from 'Duck/integrations/slack';
import { Link, NoContent, Loader } from 'UI';
import { sessions as sessionsRoute } from 'App/routes';
import withPermissions from 'HOCs/withPermissions'
import LivePlayer from './LivePlayer';

const SESSIONS_ROUTE = sessionsRoute();

function LiveSession({ 
	sessionId,
	loading,
  	hasErrors,
	session, 
	fetchSession,
  	fetchSlackList,
	hasSessionsPath
 }) {
 	usePageTitle("OpenReplay Assist");

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
		<Loader className="flex-1" loading={ loading }> 
			<LivePlayer />
		</Loader>
	);
}

export default withPermissions(['ASSIST_LIVE'], '', true)(connect((state, props) => {
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
})(LiveSession));