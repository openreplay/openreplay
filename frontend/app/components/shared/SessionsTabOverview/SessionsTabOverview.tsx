import React from 'react';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';
import NotesList from './components/Notes/NoteList';
import { connect, DefaultRootState } from 'react-redux';
import LatestSessionsMessage from './components/LatestSessionsMessage';

function SessionsTabOverview({
                               activeTab,
                               members,
                               sites,
                               siteId
                             }: {
  activeTab: string;
  members: object[];
  sites: object[];
  siteId: string;
}) {
  const activeSite: any = sites.find((s: any) => s.id === siteId);

  return (
    <div className='widget-wrapper'>
      <SessionHeader />
      <div className='border-b' />
      <LatestSessionsMessage />
      {activeTab !== 'notes' ? <SessionList /> :
        <NotesList members={members} />}
    </div>
  );
}

export default connect(
  (state: any) => ({
    // @ts-ignore
    activeTab: state.getIn(['search', 'activeTab', 'type']),
    // @ts-ignore
    members: state.getIn(['members', 'list']),
    siteId: state.getIn(['site', 'siteId']),
    sites: state.getIn(['site', 'list'])
  })
)(SessionsTabOverview);
