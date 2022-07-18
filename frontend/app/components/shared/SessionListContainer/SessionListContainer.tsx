import React from 'react';
import SessionList from './components/SessionList';
import SessionHeader from './components/SessionHeader';

interface Props {}
function SessionListContainer(props: Props) {
    return (
        <div className="widget-wrapper">
            <SessionHeader />
            <div className="p-4">
                <SessionList />
            </div>
        </div>
    );
}

export default SessionListContainer;
