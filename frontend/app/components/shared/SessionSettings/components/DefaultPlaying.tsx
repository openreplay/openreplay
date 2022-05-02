import React from 'react';
import { Toggler } from 'UI';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

function DefaultPlaying(props) {
    const { settingsStore } = useStore();
    const sessionSettings = useObserver(() => settingsStore.sessionSettings)
    
    return useObserver(() => (
        <>
            <h3 className="text-lg">Default Playing Options</h3>
            <div className="my-1">Always start playing the session from the first issue.</div>
            <div className="mt-2">
                <Toggler
                    checked={sessionSettings.skipToIssue}
                    name="test"
                    onChange={() => sessionSettings.updateKey('skipToIssue', !sessionSettings.skipToIssue)} 
                />
            </div>
        </>
    ));
}

export default DefaultPlaying;