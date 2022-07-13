import React from 'react';
import { NoContent, Loader } from 'UI';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import SessionTags from './components/SessionTags';
import NoContentMessage from './components/NoContentMessage';
import SessionList from './components/SessionList';

interface Props {}
function SessionListContainer(props: Props) {
    return (
        <div className="widget-wrapper">
            <div className="flex items-center p-4">
                <div>
                    <span className="font-bold text-lg">Sessions</span> {10}
                </div>
                <SessionTags />
            </div>
            <SessionList />
        </div>
    );
}

export default SessionListContainer;
