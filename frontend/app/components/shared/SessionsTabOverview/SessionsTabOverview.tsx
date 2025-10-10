import React from 'react';
import NoSessionsMessage from 'Shared/NoSessionsMessage/NoSessionsMessage';
import MainSearchBar from 'Shared/MainSearchBar/MainSearchBar';
import usePageTitle from '@/hooks/usePageTitle';
import withPermissions from 'HOCs/withPermissions';
import SearchActions from '../SearchActions';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';
import LatestSessionsMessage from './components/LatestSessionsMessage';
import { trackerInstance } from '@/init/openreplay';

function SessionsTabOverview() {
  React.useEffect(() => {
    trackerInstance.event('session_list_viewed');
  }, []);
  return (
    <>
      <NoSessionsMessage />
      <SearchActions />
      <MainSearchBar />
      <div className="my-4" />
      <div className="widget-wrapper">
        <SessionHeader />
        <div className="border-b" />
        <LatestSessionsMessage />
        <SessionList />
      </div>
    </>
  );
}

export default withPermissions(
  ['SESSION_REPLAY', 'SERVICE_SESSION_REPLAY'],
  '',
  false,
  false,
)(SessionsTabOverview);
