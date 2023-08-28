import React from 'react';
import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import usePageTitle from 'App/hooks/usePageTitle';
import { fetchV2, clearCurrentSession } from "Duck/sessions";
import { fetchList as fetchSlackList } from 'Duck/integrations/slack';
import { Link, NoContent, Loader } from 'UI';
import { sessions as sessionsRoute } from 'App/routes';
import withPermissions from 'HOCs/withPermissions'
import WebPlayer from './WebPlayer';
import { useStore } from 'App/mstore';
import { clearLogs } from 'App/dev/console';

import MobilePlayer from "Components/Session/MobilePlayer";

const SESSIONS_ROUTE = sessionsRoute();

interface Props {
	sessionId: string;
	loading: boolean;
	hasErrors: boolean;
	fetchV2: (sessionId: string) => void;
	clearCurrentSession: () => void;
	session: Record<string, any>;
}

function Session({ 
	sessionId,
	loading,
	hasErrors,
	fetchV2,
	clearCurrentSession,
	session,
 }: Props) {
 	usePageTitle("OpenReplay Session Player");
 	const [ initializing, setInitializing ] = useState(true)
	const { sessionStore }	= useStore();
	useEffect(() => {
		if (sessionId != null) {
			fetchV2(sessionId)
		} else {
			console.error("No sessionID in route.")
		}
		setInitializing(false)
		return () => {
			clearCurrentSession();
		}
	},[ sessionId ]);

	useEffect(() => {
		clearLogs()
		sessionStore.resetUserFilter();
	} ,[])

	const player = session.platform === 'ios' ? <MobilePlayer /> : <WebPlayer />
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
				{player}
			</Loader>
		</NoContent>
	);
}

export default withPermissions(['SESSION_REPLAY'], '', true)(connect((state: any, props: any) => {
	const { match: { params: { sessionId } } } = props;
	return {
		sessionId,
		loading: state.getIn([ 'sessions', 'loading' ]),
		hasErrors: !!state.getIn([ 'sessions', 'errors' ]),
		session: state.getIn([ 'sessions', 'current' ]),
	};
	}, {
	fetchSlackList,
	fetchV2,
	clearCurrentSession,
})(Session));
