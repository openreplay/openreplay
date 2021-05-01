import React from 'react'
import { Button } from 'UI'
import { addEvent } from 'Duck/funnelFilters'
import Event, { TYPES } from 'Types/filter/event';
import { connect } from 'react-redux';

function IssuesEmptyMessage(props) {
  const { children, show } = props;
  const createHandler = () => {
    props.addEvent(Event({ type: TYPES.LOCATION, key: TYPES.LOCATION } ))
    props.onAddEvent();
  }
  return (show ? (
        <div className="flex flex-col items-center">
        <div className="text-center my-6">
          <div className="text-3xl font-medium mb-4">See what's impacting conversions</div>
          <div className="mb-4 text-xl">Add events to your funnel to identify potential issues that are causing conversion loss.</div>
          <Button primary size="small" onClick={ createHandler }>+ ADD EVENTS</Button>
        </div>
        <img src="/img/funnel_intro.png" />
      </div>
    ) : children
  )  
}

export default connect(null, { addEvent })(IssuesEmptyMessage)
