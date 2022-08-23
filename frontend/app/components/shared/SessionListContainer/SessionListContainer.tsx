import React from 'react';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';

function SessionListContainer() {
    return (
        <div className="widget-wrapper">
            <SessionHeader />
            <div className="border-b" />
            <SessionList />
        </div>
    );
}

export default SessionListContainer;
