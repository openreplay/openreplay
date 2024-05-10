import { Input } from 'antd';
import React from 'react';
import { connect } from 'react-redux';

import { useStore } from 'App/mstore';

import LatestSessionsMessage from './components/LatestSessionsMessage';
import NotesList from './components/Notes/NoteList';
import SessionHeader from './components/SessionHeader';
import SessionList from './components/SessionList';

function SessionsTabOverview({
  activeTab,
  appliedFilter,
  members,
}: {
  activeTab: string;
  members: object[];
  sites: object[];
  siteId: string;
  appliedFilter: any;
}) {
  const [query, setQuery] = React.useState('');
  const { aiFiltersStore } = useStore();

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
      <LatestSessionsMessage />
      {activeTab !== 'notes' ? (
        <SessionList />
      ) : (
        <NotesList members={members} />
      )}
    </div>
  );
}

export default connect((state: any) => ({
  // @ts-ignore
  activeTab: state.getIn(['search', 'activeTab', 'type']),
  // @ts-ignore
  members: state.getIn(['members', 'list']),
  appliedFilter: state.getIn(['search', 'instance']),
}))(SessionsTabOverview);
