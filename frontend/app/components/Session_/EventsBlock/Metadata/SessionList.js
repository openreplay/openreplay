import React from 'react';
import { connect } from 'react-redux';
import { NoContent, Icon, Loader } from 'UI';
import Session from 'Types/session';
import SessionItem from 'Shared/SessionItem';
import stl from './sessionList.css';

@connect(state => ({ 
	currentSessionId: state.getIn([ 'sessions', 'current', 'sessionId' ])
}))
class SessionList extends React.PureComponent {
  render() {
    const { 
			similarSessions,
			loading,
			currentSessionId,
		} = this.props;

		const similarSessionWithoutCurrent = similarSessions.map(({sessions, ...rest}) => {
			return {
				...rest,
				sessions: sessions.map(Session).filter(({ sessionId }) => sessionId !== currentSessionId)
			}
    }).filter(site => site.sessions.length > 0);
    
    return (
      <Loader loading={ loading }>
        <NoContent 
          show={ !loading && (similarSessionWithoutCurrent.length === 0 || similarSessionWithoutCurrent.size === 0 )}
          title="No sessions found."
        >
          <div className={ stl.sessionList }>
            { similarSessionWithoutCurrent.map(site => (
              <div className={ stl.siteWrapper } key={ site.host }>
                <div className={ stl.siteHeader }>
                  <Icon name="window" size="14" color="gray-medium" marginRight="10" />
                  <span>{ site.name }</span>
                </div>
                { site.sessions.map(session => <SessionItem key={ session.sessionId } session={ session } />) }
              </div>
            )) }
          </div>
        </NoContent> 
      </Loader>
    );
  }
}

export default SessionList;
