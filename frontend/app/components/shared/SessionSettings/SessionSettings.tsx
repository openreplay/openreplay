import React, { useEffect } from 'react';
import { Input, Button, Toggler, Icon } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import ListingVisibility from './components/ListingVisibility';
import DefaultPlaying from './components/DefaultPlaying';
import DefaultTimezone from './components/DefaultTimezone';
import CaptureRate from './components/CaptureRate';

function SessionSettings() {
    return useObserver(() => (
        <div className="bg-white box-shadow h-screen" style={{ width: '450px'}}>
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
    ));
}

export default SessionSettings;
