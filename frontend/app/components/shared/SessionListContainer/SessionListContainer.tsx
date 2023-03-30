import React from 'react';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';
import NotesList from './components/Notes/NoteList';
import { connect } from 'react-redux';
import LatestSessionsMessage from './components/LatestSessionsMessage';

function SessionListContainer({
  activeTab,
  members,
}: {
  activeTab: string;
  fetchMembers: () => void;
  members: object[];
  clearCurrentSession: () => void;
}) {
  return (
    <div className="widget-wrapper">
      <SessionHeader />
      <div className="border-b" />
      <LatestSessionsMessage />
      {activeTab !== 'notes' ? <SessionList /> : <NotesList members={members} />}
    </div>
  );
}

export default connect(
    (state) => ({
    // @ts-ignore
    activeTab: state.getIn(['search', 'activeTab', 'type']),
    // @ts-ignore
    members: state.getIn(['members', 'list']),
  }),
)(SessionListContainer);
