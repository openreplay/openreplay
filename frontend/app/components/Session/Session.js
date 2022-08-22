import React from 'react';
import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import usePageTitle from 'App/hooks/usePageTitle';
import { fetch as fetchSession } from 'Duck/sessions';
import { fetchList as fetchSlackList } from 'Duck/integrations/slack';
import { Link, NoContent, Loader } from 'UI';
import { sessions as sessionsRoute } from 'App/routes';
import withPermissions from 'HOCs/withPermissions'
import WebPlayer from './WebPlayer';
import IOSPlayer from './IOSPlayer';
import { useStore } from 'App/mstore';

const SESSIONS_ROUTE = sessionsRoute();

function Session({ 
	sessionId,
	loading,
	hasErrors,
	session, 
	fetchSession,
	fetchSlackList,
 }) {
 	usePageTitle("OpenReplay Session Player");
 	const [ initializing, setInitializing ] = useState(true)
	const { sessionStore }	= useStore();
	useEffect(() => {
		if (sessionId != null) {
			fetchSession(sessionId)
		} else {
			console.error("No sessionID in route.")
		}
		setInitializing(false)
	},[ sessionId ]);

	useEffect(() => {
		sessionStore.resetUserFilter();
	} ,[])

	return (
		<NoContent
			show={ hasErrors }
			title="Session not found."
			subtext={
				<span>
				{'Please check your data retention plan, or try '}
				<Link to={ SESSIONS_ROUTE } className="link">{'another one'}</Link>
				</span>
			}
		>
			<Loader className="flex-1" loading={ loading || initializing }> 
				{ session.isIOS 
					? <IOSPlayer session={session} />
					: <WebPlayer />
			}
			</Loader>
		</NoContent>
	);
}

export default withPermissions(['SESSION_REPLAY'], '', true)(connect((state, props) => {
	const { match: { params: { sessionId } } } = props;
	return {
		sessionId,
		loading: state.getIn([ 'sessions', 'loading' ]),
		hasErrors: !!state.getIn([ 'sessions', 'errors' ]),
		session: state.getIn([ 'sessions', 'current' ]),
	};
	}, {
	fetchSession,
	fetchSlackList,
})(Session));
