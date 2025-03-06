import { Input } from 'antd';
import React from 'react';
import { useStore } from 'App/mstore';

import { observer } from 'mobx-react-lite';
import NoSessionsMessage from 'Shared/NoSessionsMessage/NoSessionsMessage';
import MainSearchBar from 'Shared/MainSearchBar/MainSearchBar';
import usePageTitle from '@/hooks/usePageTitle';
import withPermissions from 'HOCs/withPermissions';
import SearchActions from '../SearchActions';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';
import LatestSessionsMessage from './components/LatestSessionsMessage';

function SessionsTabOverview() {
  const [query, setQuery] = React.useState('');
  const { aiFiltersStore, searchStore } = useStore();
  const appliedFilter = searchStore.instance;
  usePageTitle('Sessions - OpenReplay');

  const handleKeyDown = (event: any) => {
    if (event.key === 'Enter') {
      fetchResults();
    }
  };
  const fetchResults = () => {
    void aiFiltersStore.omniSearch(query, appliedFilter.toData());
  };

  const testingKey =
    localStorage.getItem('__mauricio_testing_access') === 'true';
  return (
    <>
      <NoSessionsMessage />
      <SearchActions />
      <MainSearchBar />
      <div className="my-4" />
      <div className="widget-wrapper">
        {testingKey ? (
          <Input
            value={query}
            onKeyDown={handleKeyDown}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2"
            placeholder="ask session ai"
          />
        ) : null}
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
)(observer(SessionsTabOverview));
