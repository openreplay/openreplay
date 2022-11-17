import React from 'react';
import LiveSessionList from 'Shared/LiveSessionList';
import LiveSessionSearch from 'Shared/LiveSessionSearch';
import cn from 'classnames'
import AssistSearchField from './AssistSearchField';

function AssistView() {
  return (
    <div className={cn("w-full mx-auto")} style={{ maxWidth: '1300px'}}>
      <AssistSearchField />
      <LiveSessionSearch />
      <div className="my-4" />
      <LiveSessionList />
    </div>
  )
}

export default AssistView;
