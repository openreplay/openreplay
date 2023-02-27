import React from 'react';
import ListingVisibility from './components/ListingVisibility';
import DefaultPlaying from './components/DefaultPlaying';
import DefaultTimezone from './components/DefaultTimezone';
import CaptureRate from './components/CaptureRate';

function SessionSettings() {
    return (
        <div className="bg-white box-shadow h-screen overflow-y-auto">
            <div className="px-6 pt-6">
                <h1 className="text-2xl">Sessions Settings</h1>
            </div>

            <div className="p-6 border-b py-8">
                <ListingVisibility />
            </div>

            <div className="p-6 border-b py-8">
               <DefaultPlaying />
            </div>

            <div className="p-6 border-b py-8">
                <DefaultTimezone />
            </div>

            <div className="p-6 py-8">
                <CaptureRate />
            </div>
        </div>
    );
}

export default SessionSettings
