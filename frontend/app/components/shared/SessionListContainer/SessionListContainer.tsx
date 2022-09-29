import React from 'react';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';
import NotesList from './components/Notes/NoteList';
import { connect } from 'react-redux';
import { fetchList as fetchMembers } from 'Duck/member';

function SessionListContainer({
  activeTab,
  fetchMembers,
  members,
}: {
  activeTab: string;
  fetchMembers: () => void;
  members: object[];
}) {
  React.useEffect(() => {
    fetchMembers();
  }, []);
  return (
    <div className="widget-wrapper">
      <SessionHeader />
      <div className="border-b" />
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
  { fetchMembers }
)(SessionListContainer);
