import React from 'react';
import LiveSessionList from 'Shared/LiveSessionList';
import LiveSessionSearch from 'Shared/LiveSessionSearch';
import AssistSearchActions from './AssistSearchActions';
import usePageTitle from '@/hooks/usePageTitle';

function AssistView() {
  usePageTitle('Co-Browse - OpenReplay');
  return (
    <div className="w-full mx-auto" style={{ maxWidth: '1360px'}}>
      <AssistSearchActions />
      <LiveSessionSearch />
      <div className="my-4" />
      <LiveSessionList />
    </div>
  )
}

export default AssistView;
