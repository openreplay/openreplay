import React from 'react';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';
import NotesList from './components/Notes/NoteList';

function SessionListContainer() {
    return (
        <div className="widget-wrapper">
            <SessionHeader />
            <div className="border-b" />
            {/* <SessionList /> */}
            <NotesList />

        </div>
    );
}

export default SessionListContainer;
