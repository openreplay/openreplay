import React from 'react';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';

function SessionListContainer() {
    return (
        <div className="widget-wrapper">
            <SessionHeader />
            <div className="border-b" />
            <div className="px-4">
                <SessionList />
            </div>
        </div>
    );
}

export default SessionListContainer;
