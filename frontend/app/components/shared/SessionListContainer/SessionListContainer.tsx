import React from 'react';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';
import NotesList from './components/Notes/NoteList';
import { connect } from 'react-redux'

function SessionListContainer({ activeTab }: { activeTab: string }) {
    return (
        <div className="widget-wrapper">
            <SessionHeader />
            <div className="border-b" />
            {activeTab !== 'notes' ? <SessionList /> : <NotesList />}
        </div>
    );
}

export default connect(state => ({ activeTab: state.getIn(['search', 'activeTab', 'type'])}))(SessionListContainer);
