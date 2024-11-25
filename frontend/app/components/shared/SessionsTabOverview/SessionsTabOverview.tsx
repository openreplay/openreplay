import { Input } from 'antd';
import React from 'react';
import { useStore } from 'App/mstore';

import LatestSessionsMessage from './components/LatestSessionsMessage';
import NotesList from './components/Notes/NoteList';
import SessionHeader from './components/SessionHeader';
import SessionList from './components/SessionList';
import { observer } from 'mobx-react-lite';

function SessionsTabOverview() {
  const [query, setQuery] = React.useState('');
  const { aiFiltersStore, searchStore } = useStore();
  const appliedFilter = searchStore.instance;
  const isNotesRoute = searchStore.activeTab.type === 'notes';

  const handleKeyDown = (event: any) => {
    if (event.key === 'Enter') {
      fetchResults();
    }
  };
  const fetchResults = () => {
    void aiFiltersStore.omniSearch(query, appliedFilter.toData());
  };

  const testingKey = localStorage.getItem('__mauricio_testing_access') === 'true';
  return (
    <div className="widget-wrapper">
      {testingKey ? (
        <Input
          value={query}
          onKeyDown={handleKeyDown}
          onChange={(e) => setQuery(e.target.value)}
          className={'mb-2'}
          placeholder={'ask session ai'}
        />
      ) : null}
      <SessionHeader />
      <div className="border-b" />
      {!isNotesRoute ? (
        <>
          <LatestSessionsMessage />
          <SessionList />
        </>
      ) : (
        <NotesList />
      )}
    </div>
  );
}

export default observer(SessionsTabOverview);
