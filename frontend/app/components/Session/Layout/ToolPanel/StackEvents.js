import React from 'react';
import { connect } from 'react-redux';
import { useState } from 'react';
import { NoContent, Tabs } from 'UI';
import { hideHint } from 'Duck/components/player';
import { typeList } from 'Types/session/stackEvent';
import *  as PanelLayout from './PanelLayout';

import UserEvent from 'Components/Session_/StackEvents/UserEvent';
import Autoscroll from 'Components/Session_/Autoscroll';

const ALL = 'ALL';

const TABS = [ ALL, ...typeList ].map(tab =>({ text: tab, key: tab }));

function StackEvents({
  stackEvents,
  hintIsHidden,
  hideHint,
}) {
  const [ activeTab, setTab ] = useState(ALL);
  const tabs = TABS.filter(({ key }) => key === ALL || stackEvents.some(({ source }) => key === source)); // Do it once for all when we show them all

  const filteredStackEvents = stackEvents
    .filter(({ source }) => activeTab === ALL || activeTab === source);

  return (
    <>
      <PanelLayout.Header>
        <Tabs
          className="uppercase"
          tabs={ tabs }
          active={ activeTab }
          onClick={ setTab }
          border={ false }
      />
      </PanelLayout.Header>
      <PanelLayout.Body>
        <NoContent
          title="Nothing to display yet"
          subtext={ !hintIsHidden
            ?
              <>
                <a className="underline color-teal" href="https://docs.openreplay.com/integrations" target="_blank">Integrations</a>
                {' and '}
                <a className="underline color-teal" href="https://docs.openreplay.com/api#event" target="_blank">Events</a>
                { ' make debugging easier. Sync your backend logs and custom events with session replay.' }
                <br/><br/>
                <button className="color-teal" onClick={() => hideHint("stack")}>Got It!</button>
              </>
            : null
          }
          size="small"
          show={ filteredStackEvents.length === 0 }
        >
          <Autoscroll>
            { filteredStackEvents.map(userEvent => (
              <UserEvent key={ userEvent.key } userEvent={ userEvent }/>
            ))}
          </Autoscroll>
        </NoContent>
      </PanelLayout.Body>
    </>
  );
}

export default connect(state => ({
  hintIsHidden: state.getIn(['components', 'player', 'hiddenHints', 'stack']) ||
    !state.getIn([ 'site', 'list' ]).some(s => s.stackIntegrations),
}), {
  hideHint
})(StackEvents);
