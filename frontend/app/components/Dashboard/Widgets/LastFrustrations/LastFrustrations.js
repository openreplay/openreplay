import React from 'react';
import { Loader, NoContent, BrowserIcon, OsIcon } from 'UI';
import { countries } from 'App/constants';
import { diffFromNowString } from 'App/date';
import { widgetHOC, SessionLine } from '../common';

@widgetHOC('sessionsFrustration', { fitContent: true })
export default class LastFeedbacks extends React.PureComponent {
  render() {
    const { data: sessions, loading } = this.props;
    return (
      <Loader loading={ loading } size="small">
        <NoContent
          size="small"
          title="No recordings found"
          show={ sessions.size === 0 }
        >
          { sessions.map(({ 
              startedAt,
              sessionId, 
              clickRage, 
              returningLocation, 
              userBrowser, 
              userOs,
              userCountry,
            }) => (
            <SessionLine 
              sessionId={ sessionId }
              icon={ clickRage ? "event/click" : "event/link" }
              info={ 
                <span className="flex items-center" >
                  { clickRage ? "Click Rage" : "Returning Location" }
                  <BrowserIcon browser={ userBrowser } size="16" className="ml-10 mr-10" />
                  <OsIcon os={ userOs } size="16" />
                </span>
              }
              subInfo={ `${ diffFromNowString(startedAt) } ago - ${ countries[ userCountry ] || '' }` }
            />
          ))}
        </NoContent>
      </Loader>
    );
  }
}
